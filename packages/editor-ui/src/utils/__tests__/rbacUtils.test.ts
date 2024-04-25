import type { RouteLocationNormalized } from 'vue-router';
import {
	inferProjectIdFromRoute,
	inferResourceTypeFromRoute,
	inferResourceIdFromRoute,
} from '../rbacUtils';

describe('rbacUtils', () => {
	describe('inferProjectIdFromRoute()', () => {
		it('should infer project ID from route correctly', () => {
			const route = { path: '/dashboard/projects/123/settings' } as RouteLocationNormalized;
			const projectId = inferProjectIdFromRoute(route);
			expect(projectId).toBe('123');
		});

		it('should return undefined for project ID if not found', () => {
			const route = { path: '/dashboard/settings' } as RouteLocationNormalized;
			const projectId = inferProjectIdFromRoute(route);
			expect(projectId).toBeUndefined();
		});
	});

	describe('inferResourceTypeFromRoute()', () => {
		it.each([
			['/workflows', 'workflow'],
			['/workflows/123', 'workflow'],
			['/workflows/123/settings', 'workflow'],
			['/credentials', 'credential'],
			['/variables', 'variable'],
			['/users', 'user'],
			['/source-control', 'sourceControl'],
			['/external-secrets', 'externalSecretsStore'],
		])('should infer resource type from %s correctly to %s', (path, type) => {
			const route = { path } as RouteLocationNormalized;
			const resourceType = inferResourceTypeFromRoute(route);
			expect(resourceType).toBe(type);
		});

		it('should return undefined for resource type if not found', () => {
			const route = { path: '/dashboard/settings' } as RouteLocationNormalized;
			const resourceType = inferResourceTypeFromRoute(route);
			expect(resourceType).toBeUndefined();
		});
	});

	describe('inferResourceIdFromRoute()', () => {
		it('should infer resource ID from params.id', () => {
			const route = { params: { id: 'abc123' } } as RouteLocationNormalized;
			const resourceId = inferResourceIdFromRoute(route);
			expect(resourceId).toBe('abc123');
		});

		it('should infer resource ID from params.name if id is not present', () => {
			const route = { params: { name: 'my-resource' } } as RouteLocationNormalized;
			const resourceId = inferResourceIdFromRoute(route);
			expect(resourceId).toBe('my-resource');
		});

		it('should return undefined for resource ID if neither id nor name is present', () => {
			const route = { params: {} } as RouteLocationNormalized;
			const resourceId = inferResourceIdFromRoute(route);
			expect(resourceId).toBeUndefined();
		});
	});
});
