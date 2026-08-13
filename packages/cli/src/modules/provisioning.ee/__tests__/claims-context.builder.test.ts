import {
	buildOidcClaimsContext,
	buildSamlClaimsContext,
	withProjectContext,
} from '../claims-context.builder';
import type { ProjectInfo, RoleResolverContext } from '../role-resolver-types';

describe('claims-context.builder', () => {
	describe('buildOidcClaimsContext', () => {
		it('should merge idToken and userInfo into $claims with userInfo taking precedence', () => {
			const idToken = { sub: 'user-123', role: 'admin', email: 'old@example.com' };
			const userInfo = { email: 'new@example.com', name: 'Test User' };

			const context = buildOidcClaimsContext(idToken, userInfo);

			expect(context.$claims).toEqual({
				sub: 'user-123',
				role: 'admin',
				email: 'new@example.com',
				name: 'Test User',
			});
		});

		it('should populate $oidc.idToken and $oidc.userInfo', () => {
			const idToken = { sub: 'user-123' };
			const userInfo = { email: 'test@example.com' };

			const context = buildOidcClaimsContext(idToken, userInfo);

			expect(context.$oidc).toEqual({
				idToken: { sub: 'user-123' },
				userInfo: { email: 'test@example.com' },
			});
		});

		it('should set $provider to oidc', () => {
			const context = buildOidcClaimsContext({}, {});

			expect(context.$provider).toBe('oidc');
		});

		it('should not have $saml set', () => {
			const context = buildOidcClaimsContext({}, {});

			expect(context.$saml).toBeUndefined();
		});

		it('should deep-clone input data so mutations do not affect the context', () => {
			const idToken = { sub: 'user-123', nested: { groups: ['a'] } };
			const userInfo = { email: 'test@example.com' };

			const context = buildOidcClaimsContext(idToken, userInfo);

			idToken.nested.groups.push('b');
			userInfo.email = 'changed@example.com';

			expect(context.$claims).toEqual({
				sub: 'user-123',
				nested: { groups: ['a'] },
				email: 'test@example.com',
			});
			expect(context.$oidc!.idToken).toEqual({ sub: 'user-123', nested: { groups: ['a'] } });
			expect(context.$oidc!.userInfo).toEqual({ email: 'test@example.com' });
		});
	});

	describe('buildSamlClaimsContext', () => {
		it('should populate $claims from raw attributes', () => {
			const attributes = { email: 'test@example.com', role: 'admin' };

			const context = buildSamlClaimsContext(attributes);

			expect(context.$claims).toEqual({ email: 'test@example.com', role: 'admin' });
		});

		it('should populate $saml.attributes', () => {
			const attributes = { email: 'test@example.com' };

			const context = buildSamlClaimsContext(attributes);

			expect(context.$saml).toEqual({
				attributes: { email: 'test@example.com' },
			});
		});

		it('should set $provider to saml', () => {
			const context = buildSamlClaimsContext({});

			expect(context.$provider).toBe('saml');
		});

		it('should not have $oidc set', () => {
			const context = buildSamlClaimsContext({});

			expect(context.$oidc).toBeUndefined();
		});

		it('should deep-clone input data so mutations do not affect the context', () => {
			const attributes = { groups: ['engineering', 'devops'] };

			const context = buildSamlClaimsContext(attributes);

			attributes.groups.push('sales');

			expect(context.$claims).toEqual({ groups: ['engineering', 'devops'] });
			expect(context.$saml!.attributes).toEqual({ groups: ['engineering', 'devops'] });
		});
	});

	describe('withProjectContext', () => {
		const baseContext: RoleResolverContext = {
			$claims: { role: 'admin' },
			$provider: 'oidc',
		};

		const project: ProjectInfo = {
			id: 'proj-1',
			name: 'Engineering',
			type: 'team',
			description: 'Engineering team project',
		};

		it('should add $project to context', () => {
			const enriched = withProjectContext(baseContext, project);

			expect(enriched.$project).toEqual({
				id: 'proj-1',
				name: 'Engineering',
				type: 'team',
				description: 'Engineering team project',
			});
		});

		it('should preserve existing context properties', () => {
			const enriched = withProjectContext(baseContext, project);

			expect(enriched.$claims).toEqual({ role: 'admin' });
			expect(enriched.$provider).toBe('oidc');
		});

		it('should not mutate the original context', () => {
			const enriched = withProjectContext(baseContext, project);

			expect(baseContext.$project).toBeUndefined();
			expect(enriched.$project).toBeDefined();
		});

		it('should not be affected by mutations to the project input', () => {
			const mutableProject = { ...project };
			const enriched = withProjectContext(baseContext, mutableProject);

			mutableProject.name = 'Changed';

			expect(enriched.$project!.name).toBe('Engineering');
		});
	});
});
