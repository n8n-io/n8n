import { testDb } from '@n8n/backend-test-utils';
import type { AuthenticatedRequest } from '@n8n/db';
import { UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import { JwtService } from '@/services/jwt.service';
import { createMember, createOwner } from '@test-integration/db/users';

import { TOKEN_EXCHANGE_ISSUER } from '../../token-exchange.types';
import { ScopedJwtStrategy } from '../scoped-jwt.strategy';

const instanceSettings = mock<InstanceSettings>({ encryptionKey: 'test-key' });
const jwtService = new JwtService(instanceSettings, mock());

function makeBearerReq(token: string): AuthenticatedRequest {
	const req = mock<AuthenticatedRequest>();
	req.headers = { authorization: `Bearer ${token}` } as unknown as AuthenticatedRequest['headers'];
	return req;
}

function makeScopedJwt(sub: string, actSub?: string): string {
	return jwtService.sign({
		iss: TOKEN_EXCHANGE_ISSUER,
		sub,
		...(actSub && { act: { sub: actSub } }),
		iat: Math.floor(Date.now() / 1000),
		exp: Math.floor(Date.now() / 1000) + 3600,
		jti: 'test-jti',
	});
}

async function resolveRoleScopes(userId: string): Promise<string[]> {
	const user = await Container.get(UserRepository).findOne({
		where: { id: userId },
		relations: { role: true },
	});
	return user!.role.scopes.map((s) => s.slug);
}

describe('ScopedJwtStrategy (integration)', () => {
	let strategy: ScopedJwtStrategy;

	beforeAll(async () => {
		await testDb.init();
		strategy = new ScopedJwtStrategy(jwtService, Container.get(UserRepository));
	});

	beforeEach(async () => {
		await testDb.truncate(['User']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('buildTokenGrant', () => {
		it('returns a grant with the subject role scopes when no act claim is present', async () => {
			const owner = await createOwner();
			const expectedScopes = await resolveRoleScopes(owner.id);

			const grant = await strategy.buildTokenGrant(makeScopedJwt(owner.id));

			if (!grant) throw new Error('expected grant');
			expect(grant.subject.id).toBe(owner.id);
			expect(grant.actor).toBeUndefined();
			expect(grant.scopes).toEqual(expect.arrayContaining(expectedScopes));
			expect(grant.scopes).toHaveLength(expectedScopes.length);
		});

		it('returns a grant with the actor role scopes when the act claim resolves', async () => {
			const subject = await createOwner();
			const actor = await createMember();
			const actorScopes = await resolveRoleScopes(actor.id);

			const grant = await strategy.buildTokenGrant(makeScopedJwt(subject.id, actor.id));

			if (!grant) throw new Error('expected grant');
			expect(grant.subject.id).toBe(subject.id);
			expect(grant.actor?.id).toBe(actor.id);
			expect(grant.scopes).toEqual(expect.arrayContaining(actorScopes));
			expect(grant.scopes).toHaveLength(actorScopes.length);
		});

		it('falls back to subject scopes when the actor ID is not in the DB', async () => {
			const subject = await createOwner();
			const subjectScopes = await resolveRoleScopes(subject.id);

			const grant = await strategy.buildTokenGrant(
				makeScopedJwt(subject.id, 'b4439ae8-4c33-4aac-9bc0-ff1891b03e13'),
			);

			if (!grant) throw new Error('expected grant');
			expect(grant.subject.id).toBe(subject.id);
			expect(grant.actor).toBeUndefined();
			expect(grant.scopes).toHaveLength(subjectScopes.length);
		});

		it('rejects tokens that fail validation', async () => {
			// Wrong issuer → abstain. Subject missing / disabled / disabled-actor → fail.
			expect(await strategy.buildTokenGrant(jwtService.sign({ iss: 'n8n', sub: '1' }))).toBeNull();
			expect(
				await strategy.buildTokenGrant(makeScopedJwt('422b72e6-2df2-47c9-8082-f8393b088fde')),
			).toBe(false);

			const disabledSubject = await createOwner();
			await Container.get(UserRepository).update({ id: disabledSubject.id }, { disabled: true });
			expect(await strategy.buildTokenGrant(makeScopedJwt(disabledSubject.id))).toBe(false);

			const subject = await createOwner();
			const disabledActor = await createMember();
			await Container.get(UserRepository).update({ id: disabledActor.id }, { disabled: true });
			expect(await strategy.buildTokenGrant(makeScopedJwt(subject.id, disabledActor.id))).toBe(
				false,
			);
		});
	});

	it('authenticate wrapper sets req.user to the actor when delegation is present', async () => {
		const subject = await createOwner();
		const actor = await createMember();
		const req = makeBearerReq(makeScopedJwt(subject.id, actor.id));

		expect(await strategy.authenticate(req)).toBe(true);
		expect(req.user.id).toBe(actor.id);
		expect(req.tokenGrant?.subject.id).toBe(subject.id);
		expect(req.tokenGrant?.actor?.id).toBe(actor.id);
	});
});
