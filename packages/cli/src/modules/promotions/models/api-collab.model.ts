import { Service } from '@n8n/di';
import { UnexpectedError, UserError } from 'n8n-workflow';

import { importUnitPackage } from './package-transport';
import { PeerApi, type PeerRef } from './peer-api';
import type { PromotionContext, PromotionModel, SubmitPromotionRequest } from '../promotion-model';
import type { Promotion } from '../promotion.entity';
import { PromotionRepository } from '../promotion.repository';

interface ApiCollabMetadata {
	/** How THIS instance reaches the other instance's public API. */
	peer?: PeerRef;
	/** The mirrored promotion's id on the other instance. */
	remotePromotionId?: string;
	/** Last peer state seen by sync, for visibility only. */
	peerState?: string;
	[key: string]: unknown;
}

/**
 * Two-instance collaboration via public API — the canvas's "double approval
 * direct promotion". Submit on the source creates a mirror promotion on the
 * destination; each side approves independently; only the destination can
 * apply. Apply runs server-side on the destination: it pulls the package from
 * the source's export endpoint, imports it locally, then marks the source
 * promotion promoted. No pollers — `sync` refreshes the peer state on demand.
 *
 * Source submit options: `peerUrl`/`peerApiKey` (the destination) and
 * `selfUrl`/`selfApiKey` (how the destination calls back to this instance).
 */
@Service()
export class ApiCollabModel implements PromotionModel {
	readonly name = 'api-collab';

	constructor(private readonly repository: PromotionRepository) {}

	async submit(request: SubmitPromotionRequest) {
		const { options } = request;
		return options.role === 'destination'
			? await this.submitMirror(request)
			: await this.submitSource(request);
	}

	private async submitSource({ unitOfWork, options }: SubmitPromotionRequest) {
		if (!unitOfWork) throw new UserError('api-collab requires a unitOfWork');
		const { peerUrl, peerApiKey, selfUrl, selfApiKey } = options;
		if (
			typeof peerUrl !== 'string' ||
			typeof peerApiKey !== 'string' ||
			typeof selfUrl !== 'string' ||
			typeof selfApiKey !== 'string'
		) {
			throw new UserError(
				'api-collab submit requires options peerUrl, peerApiKey, selfUrl, selfApiKey',
			);
		}

		const metadata: ApiCollabMetadata = { peer: { url: peerUrl, apiKey: peerApiKey } };
		const promotion = await this.repository.save(
			this.repository.create({
				model: this.name,
				role: 'source' as const,
				unitOfWorkType: unitOfWork.type,
				unitOfWorkId: unitOfWork.id,
				state: 'in_review',
				metadata,
			}),
		);

		// Mirror the promotion on the destination; it gets the callback ref to this instance.
		const mirror = await new PeerApi(metadata.peer!).createPromotion({
			model: this.name,
			unitOfWork,
			options: {
				role: 'destination',
				peerUrl: selfUrl,
				peerApiKey: selfApiKey,
				remotePromotionId: promotion.id,
			},
		});

		promotion.metadata = { ...metadata, remotePromotionId: mirror.id };
		return await this.repository.save(promotion);
	}

	private async submitMirror({ unitOfWork, options }: SubmitPromotionRequest) {
		if (!unitOfWork) throw new UserError('api-collab mirror requires a unitOfWork');
		const { peerUrl, peerApiKey, remotePromotionId } = options;
		if (
			typeof peerUrl !== 'string' ||
			typeof peerApiKey !== 'string' ||
			typeof remotePromotionId !== 'string'
		) {
			throw new UserError(
				'api-collab mirror requires options peerUrl, peerApiKey, remotePromotionId',
			);
		}
		const metadata: ApiCollabMetadata = {
			peer: { url: peerUrl, apiKey: peerApiKey },
			remotePromotionId,
		};
		return await this.repository.save(
			this.repository.create({
				model: this.name,
				role: 'destination' as const,
				unitOfWorkType: unitOfWork.type,
				unitOfWorkId: unitOfWork.id,
				state: 'in_review',
				metadata,
			}),
		);
	}

	availableActions(promotion: Promotion) {
		if (promotion.role === 'source') {
			// mark-promoted is normally triggered remotely by the destination's apply
			return { in_review: ['approve'], approved: ['mark-promoted'] }[promotion.state] ?? [];
		}
		return { in_review: ['approve'], approved: ['apply'] }[promotion.state] ?? [];
	}

	async execute(
		action: string,
		promotion: Promotion,
		_payload: Record<string, unknown> | undefined,
		ctx: PromotionContext,
	) {
		if (action === 'approve') return await this.transition(promotion, 'approved');
		if (action === 'mark-promoted') return await this.transition(promotion, 'promoted');
		if (action === 'apply') return await this.apply(promotion, ctx);
		throw new UnexpectedError(`api-collab has no action "${action}"`);
	}

	/** Destination-side apply: both approvals are required; the source one is checked live. */
	private async apply(promotion: Promotion, ctx: PromotionContext) {
		const peer = this.peerApi(promotion);
		const remoteId = this.remoteId(promotion);

		const remote = await peer.getPromotion(remoteId);
		if (remote.state !== 'approved') {
			throw new UserError(
				`The source promotion is in state "${String(remote.state)}"; both sides must approve before apply`,
			);
		}

		const packageBuffer = await peer.exportUnitPackage({
			type: promotion.unitOfWorkType,
			id: promotion.unitOfWorkId,
		});
		await importUnitPackage(ctx.user, packageBuffer);
		await peer.runPromotionAction(remoteId, 'mark-promoted');

		return await this.transition(promotion, 'promoted');
	}

	async sync(promotion: Promotion) {
		const remote = await this.peerApi(promotion).getPromotion(this.remoteId(promotion));
		promotion.metadata = { ...promotion.metadata, peerState: remote.state };
		return await this.repository.save(promotion);
	}

	private async transition(promotion: Promotion, state: string) {
		promotion.state = state;
		return await this.repository.save(promotion);
	}

	private peerApi(promotion: Promotion) {
		const { peer } = promotion.metadata as ApiCollabMetadata;
		if (!peer) throw new UnexpectedError('api-collab promotion has no peer reference');
		return new PeerApi(peer);
	}

	private remoteId(promotion: Promotion) {
		const { remotePromotionId } = promotion.metadata as ApiCollabMetadata;
		if (!remotePromotionId) {
			throw new UnexpectedError('api-collab promotion has no remote promotion id');
		}
		return remotePromotionId;
	}
}
