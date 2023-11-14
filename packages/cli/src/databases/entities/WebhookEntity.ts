import { IHttpRequestMethods } from 'n8n-workflow';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity()
@Index(['webhookId', 'method', 'pathLength'])
export class WebhookEntity {
	@Column()
	workflowId: string;

	@PrimaryColumn()
	webhookPath: string;

	@PrimaryColumn({ type: 'text' })
	method: IHttpRequestMethods;

	@Column()
	node: string;

	@Column({ nullable: true })
	webhookId?: string;

	@Column({ nullable: true })
	pathLength?: number;

	/**
	 * Unique section of production webhook path, appended to `${instanceUrl}/webhook/`.
	 * - Example for static UUID webhook: `87dd035f-9606-47b7-b443-8b675fe25719`
	 * - Example for static user-defined webhook: `user/:id/posts`
	 * - Example for dynamic webhook: `7e0e2b2a-19ba-4a6c-b452-4b46c0e11749/user/:id/posts`
	 */
	private get uniquePath() {
		return this.webhookPath.includes(':')
			? [this.webhookId, this.webhookPath].join('/')
			: this.webhookPath;
	}

	get staticSegments() {
		return this.webhookPath.split('/').filter((s) => !s.startsWith(':'));
	}

	/**
	 * Whether the webhook has at least one dynamic path segment, e.g. `:id` in `<uuid>/user/:id/posts`.
	 */
	get isDynamic() {
		return this.webhookPath.split('/').some((s) => s.startsWith(':'));
	}
}
