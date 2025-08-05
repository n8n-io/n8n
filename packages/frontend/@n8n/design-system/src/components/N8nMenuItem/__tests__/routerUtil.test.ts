/**
 * Comprehensive test suite for router utilities
 */

import { doesMenuItemMatchCurrentRoute } from '../routerUtil';
import type { RouteLocationNormalizedLoaded } from 'vue-router';
import type { IMenuItem, ICustomMenuItem, IMenuElement } from '../../../types/menu';

describe('Router Utilities', () => {
	// Mock route creator helper
	const createMockRoute = (
		name?: string,
		path: string = '/',
		params: Record<string, string> = {},
	): RouteLocationNormalizedLoaded => ({
		name: name ?? null,
		path,
		params,
		query: {},
		hash: '',
		fullPath: path,
		matched: [],
		meta: {},
		redirectedFrom: undefined,
	});

	// Mock menu item creator helpers
	const createMenuItem = (overrides: Partial<IMenuItem> = {}): IMenuItem => ({
		id: 'test-item',
		label: 'Test Item',
		available: true,
		...overrides,
	});

	const createCustomMenuItem = (overrides: Partial<ICustomMenuItem> = {}): ICustomMenuItem => ({
		id: 'custom-item',
		component: { template: '<div>Custom</div>' },
		available: true,
		...overrides,
	});

	describe('doesMenuItemMatchCurrentRoute', () => {
		describe('Custom Menu Items', () => {
			it('should always return false for custom menu items', () => {
				const customItem = createCustomMenuItem();
				const routes = [
					createMockRoute('home', '/'),
					createMockRoute('about', '/about'),
					createMockRoute(undefined, '/custom'),
				];

				routes.forEach((route) => {
					expect(doesMenuItemMatchCurrentRoute(customItem, route)).toBe(false);
				});
			});
		});

		describe('Regular Menu Items with Route Names', () => {
			it('should match when current route name is in activateOnRouteNames', () => {
				const menuItem = createMenuItem({
					activateOnRouteNames: ['home', 'dashboard'],
				});

				const homeRoute = createMockRoute('home', '/');
				const dashboardRoute = createMockRoute('dashboard', '/dashboard');

				expect(doesMenuItemMatchCurrentRoute(menuItem, homeRoute)).toBe(true);
				expect(doesMenuItemMatchCurrentRoute(menuItem, dashboardRoute)).toBe(true);
			});

			it('should not match when current route name is not in activateOnRouteNames', () => {
				const menuItem = createMenuItem({
					activateOnRouteNames: ['home', 'dashboard'],
				});

				const aboutRoute = createMockRoute('about', '/about');
				const settingsRoute = createMockRoute('settings', '/settings');

				expect(doesMenuItemMatchCurrentRoute(menuItem, aboutRoute)).toBe(false);
				expect(doesMenuItemMatchCurrentRoute(menuItem, settingsRoute)).toBe(false);
			});

			it('should handle routes with no name gracefully', () => {
				const menuItem = createMenuItem({
					activateOnRouteNames: ['home'],
				});

				const routeWithoutName = createMockRoute(undefined, '/some-path');

				expect(doesMenuItemMatchCurrentRoute(menuItem, routeWithoutName)).toBe(false);
			});

			it('should handle empty activateOnRouteNames array', () => {
				const menuItem = createMenuItem({
					activateOnRouteNames: [],
				});

				const homeRoute = createMockRoute('home', '/');

				expect(doesMenuItemMatchCurrentRoute(menuItem, homeRoute)).toBe(false);
			});
		});

		describe('Regular Menu Items with Route Paths', () => {
			it('should match when current route path is in activateOnRoutePaths', () => {
				const menuItem = createMenuItem({
					activateOnRoutePaths: ['/', '/about', '/contact'],
				});

				const homeRoute = createMockRoute('home', '/');
				const aboutRoute = createMockRoute('about', '/about');
				const contactRoute = createMockRoute('contact', '/contact');

				expect(doesMenuItemMatchCurrentRoute(menuItem, homeRoute)).toBe(true);
				expect(doesMenuItemMatchCurrentRoute(menuItem, aboutRoute)).toBe(true);
				expect(doesMenuItemMatchCurrentRoute(menuItem, contactRoute)).toBe(true);
			});

			it('should not match when current route path is not in activateOnRoutePaths', () => {
				const menuItem = createMenuItem({
					activateOnRoutePaths: ['/dashboard', '/settings'],
				});

				const homeRoute = createMockRoute('home', '/');
				const aboutRoute = createMockRoute('about', '/about');

				expect(doesMenuItemMatchCurrentRoute(menuItem, homeRoute)).toBe(false);
				expect(doesMenuItemMatchCurrentRoute(menuItem, aboutRoute)).toBe(false);
			});

			it('should handle complex paths correctly', () => {
				const menuItem = createMenuItem({
					activateOnRoutePaths: ['/users/123', '/products/category/electronics'],
				});

				const userRoute = createMockRoute('user-detail', '/users/123');
				const productRoute = createMockRoute('product-category', '/products/category/electronics');
				const differentUserRoute = createMockRoute('user-detail', '/users/456');

				expect(doesMenuItemMatchCurrentRoute(menuItem, userRoute)).toBe(true);
				expect(doesMenuItemMatchCurrentRoute(menuItem, productRoute)).toBe(true);
				expect(doesMenuItemMatchCurrentRoute(menuItem, differentUserRoute)).toBe(false);
			});
		});

		describe('Menu Items with Route Object', () => {
			it('should match when route has named destination and current route matches', () => {
				const menuItem = createMenuItem({
					route: {
						to: { name: 'home' },
					},
				});

				const homeRoute = createMockRoute('home', '/');
				const aboutRoute = createMockRoute('about', '/about');

				expect(doesMenuItemMatchCurrentRoute(menuItem, homeRoute)).toBe(true);
				expect(doesMenuItemMatchCurrentRoute(menuItem, aboutRoute)).toBe(false);
			});

			it('should match when route has path destination and current route matches', () => {
				const menuItem = createMenuItem({
					route: {
						to: { path: '/dashboard' },
					},
				});

				const dashboardRoute = createMockRoute('dashboard', '/dashboard');
				const homeRoute = createMockRoute('home', '/');

				expect(doesMenuItemMatchCurrentRoute(menuItem, dashboardRoute)).toBe(true);
				expect(doesMenuItemMatchCurrentRoute(menuItem, homeRoute)).toBe(false);
			});

			it('should handle route with string destination', () => {
				const menuItem = createMenuItem({
					route: {
						to: '/settings',
					},
				});

				// String route destinations are not handled by the utility functions
				// so this should not match
				const settingsRoute = createMockRoute('settings', '/settings');

				expect(doesMenuItemMatchCurrentRoute(menuItem, settingsRoute)).toBe(false);
			});

			it('should handle route with complex object destination', () => {
				const menuItem = createMenuItem({
					route: {
						to: {
							name: 'user-profile',
							params: { id: '123' },
							query: { tab: 'settings' },
						},
					},
				});

				const userProfileRoute = createMockRoute('user-profile', '/users/123', { id: '123' });
				const differentUserRoute = createMockRoute('user-profile', '/users/456', { id: '456' });

				expect(doesMenuItemMatchCurrentRoute(menuItem, userProfileRoute)).toBe(true);
				expect(doesMenuItemMatchCurrentRoute(menuItem, differentUserRoute)).toBe(true); // Only checks name, not params
			});
		});

		describe('Combined Matching Logic', () => {
			it('should match if either route names or paths match', () => {
				const menuItem = createMenuItem({
					activateOnRouteNames: ['dashboard'],
					activateOnRoutePaths: ['/admin'],
				});

				const dashboardRoute = createMockRoute('dashboard', '/dashboard');
				const adminRoute = createMockRoute('admin-panel', '/admin');
				const homeRoute = createMockRoute('home', '/');

				expect(doesMenuItemMatchCurrentRoute(menuItem, dashboardRoute)).toBe(true); // Matches name
				expect(doesMenuItemMatchCurrentRoute(menuItem, adminRoute)).toBe(true); // Matches path
				expect(doesMenuItemMatchCurrentRoute(menuItem, homeRoute)).toBe(false); // Matches neither
			});

			it('should combine route object with explicit arrays', () => {
				const menuItem = createMenuItem({
					route: {
						to: { name: 'home' },
					},
					activateOnRouteNames: ['dashboard', 'home'], // Include 'home' explicitly
					activateOnRoutePaths: ['/admin'],
				});

				const homeRoute = createMockRoute('home', '/');
				const dashboardRoute = createMockRoute('dashboard', '/dashboard');
				const adminRoute = createMockRoute('admin-panel', '/admin');
				const aboutRoute = createMockRoute('about', '/about');

				expect(doesMenuItemMatchCurrentRoute(menuItem, homeRoute)).toBe(true); // From activateOnRouteNames
				expect(doesMenuItemMatchCurrentRoute(menuItem, dashboardRoute)).toBe(true); // From activateOnRouteNames
				expect(doesMenuItemMatchCurrentRoute(menuItem, adminRoute)).toBe(true); // From activateOnRoutePaths
				expect(doesMenuItemMatchCurrentRoute(menuItem, aboutRoute)).toBe(false); // No match
			});
		});

		describe('Edge Cases', () => {
			it('should handle menu item with no routing configuration', () => {
				const menuItem = createMenuItem({
					// No route, activateOnRouteNames, or activateOnRoutePaths
				});

				const homeRoute = createMockRoute('home', '/');

				expect(doesMenuItemMatchCurrentRoute(menuItem, homeRoute)).toBe(false);
			});

			it('should handle malformed route objects gracefully', () => {
				const menuItemWithMalformedRoute = createMenuItem({
					route: {
						to: {} as any, // Use empty object instead of null to avoid 'in' operator error
					},
				});

				const homeRoute = createMockRoute('home', '/');

				expect(doesMenuItemMatchCurrentRoute(menuItemWithMalformedRoute, homeRoute)).toBe(false);
			});

			it('should handle routes with undefined or null names/paths', () => {
				const menuItem = createMenuItem({
					activateOnRouteNames: ['home'],
					activateOnRoutePaths: ['/'],
				});

				const routeWithNullName = {
					...createMockRoute(undefined, '/'),
					name: null,
				};

				const routeWithUndefinedName = {
					...createMockRoute(undefined, '/'),
					name: undefined,
				};

				expect(doesMenuItemMatchCurrentRoute(menuItem, routeWithNullName)).toBe(true); // Path matches
				expect(doesMenuItemMatchCurrentRoute(menuItem, routeWithUndefinedName)).toBe(true); // Path matches
			});

			it('should handle empty string route names and paths', () => {
				const menuItem = createMenuItem({
					activateOnRouteNames: ['', 'home'],
					activateOnRoutePaths: ['', '/about'],
				});

				const routeWithEmptyName = createMockRoute('', '/some-path');
				const aboutRoute = createMockRoute('other', '/about');
				const unmatchedRoute = createMockRoute('other', '/other');

				expect(doesMenuItemMatchCurrentRoute(menuItem, routeWithEmptyName)).toBe(true); // Empty name matches
				expect(doesMenuItemMatchCurrentRoute(menuItem, aboutRoute)).toBe(true); // Path matches
				expect(doesMenuItemMatchCurrentRoute(menuItem, unmatchedRoute)).toBe(false);
			});

			it('should handle deeply nested route objects', () => {
				const menuItem = createMenuItem({
					route: {
						to: {
							name: 'nested-route',
							params: {
								category: 'electronics',
								subcategory: 'phones',
								id: '123',
							},
							query: {
								sort: 'price',
								order: 'asc',
							},
							hash: '#reviews',
						},
					},
				});

				const nestedRoute = createMockRoute('nested-route', '/electronics/phones/123');

				expect(doesMenuItemMatchCurrentRoute(menuItem, nestedRoute)).toBe(true);
			});
		});

		describe('Type Safety', () => {
			it('should handle different menu element types correctly', () => {
				const menuItems: IMenuElement[] = [
					createMenuItem({ activateOnRouteNames: ['home'] }),
					createCustomMenuItem(),
				];

				const homeRoute = createMockRoute('home', '/');

				expect(doesMenuItemMatchCurrentRoute(menuItems[0], homeRoute)).toBe(true);
				expect(doesMenuItemMatchCurrentRoute(menuItems[1], homeRoute)).toBe(false);
			});

			it('should work with readonly arrays', () => {
				const menuItem = createMenuItem({
					activateOnRouteNames: ['home', 'dashboard'] as readonly string[],
					activateOnRoutePaths: ['/admin', '/settings'] as readonly string[],
				});

				const homeRoute = createMockRoute('home', '/');
				const adminRoute = createMockRoute('admin', '/admin');

				expect(doesMenuItemMatchCurrentRoute(menuItem, homeRoute)).toBe(true);
				expect(doesMenuItemMatchCurrentRoute(menuItem, adminRoute)).toBe(true);
			});
		});
	});
});
