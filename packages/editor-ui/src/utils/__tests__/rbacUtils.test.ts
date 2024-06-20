import { mock } from 'vitest-mock-extended';
import type { RouteLocationNormalized } from 'vue-router';
import {
	inferProjectIdFromRoute,
	inferResourceTypeFromRoute,
	inferResourceIdFromRoute,
} from '@/utils/rbacUtils';

describe('rbacUtils', () => {
	describe('inferProjectIdFromRoute()', () => {
		it('should infer project ID from route correctly', () => {
			const route = mock<RouteLocationNormalized>({ path: '/dashboard/projects/123/settings' });
			const projectId = inferProjectIdFromRoute(route);
			expect(projectId).toBe('123');
		});

		it('should return undefined for project ID if not found', () => {
			const route = mock<RouteLocationNormalized>({ path: '/dashboard/settings' });
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
			['/external-secrets', 'externalSecret'],
		])('should infer resource type from %s correctly to %s', (path, type) => {
			const route = mock<RouteLocationNormalized>({ path });
			const resourceType = inferResourceTypeFromRoute(route);
			expect(resourceType).toBe(type);
		});

		it('should return undefined for resource type if not found', () => {
			const route = mock<RouteLocationNormalized>({ path: '/dashboard/settings' });
			const resourceType = inferResourceTypeFromRoute(route);
			expect(resourceType).toBeUndefined();
		});
	});

	describe('inferResourceIdFromRoute()', () => {
		it('should infer resource ID from params.id', () => {
			const route = mock<RouteLocationNormalized>({ params: { id: 'abc123' } });
			const resourceId = inferResourceIdFromRoute(route);
			expect(resourceId).toBe('abc123');
		});

		it('should infer resource ID from params.name if id is not present', () => {
			const route = mock<RouteLocationNormalized>();
			route.params = { name: 'my-resource' };
			const resourceId = inferResourceIdFromRoute(route);
			expect(resourceId).toBe('my-resource');
		});

		it('should return undefined for resource ID if neither id nor name is present', () => {
			const route = mock<RouteLocationNormalized>();
			route.params = {};
			const resourceId = inferResourceIdFromRoute(route);
			expect(resourceId).toBeUndefined();
		});
	});
});
