import { describe, it, expect } from 'vitest';
import type { RouteRecordRaw } from 'vue-router';

import { assertUniqueRouteNames } from './routeNames';
import type { FrontendModuleDescription } from './types/descriptor';

const component = async () => await Promise.resolve({});

const moduleWith = (id: string, routes: RouteRecordRaw[]): FrontendModuleDescription => ({
	id,
	name: id,
	description: '',
	icon: 'box',
	routes,
});

const route = (name: string, children?: RouteRecordRaw[]): RouteRecordRaw =>
	({ path: name.toLowerCase(), name, component, children }) as RouteRecordRaw;

describe('assertUniqueRouteNames', () => {
	it('should accept modules with distinct route names', () => {
		expect(() =>
			assertUniqueRouteNames([
				moduleWith('otel', [route('SettingsOpenTelemetryView')]),
				moduleWith('mcp', [route('McpSettings')]),
			]),
		).not.toThrow();
	});

	it('should accept modules that declare no routes', () => {
		expect(() =>
			assertUniqueRouteNames([{ id: 'a', name: 'a', description: '', icon: 'box' }]),
		).not.toThrow();
	});

	it('should throw and name both modules when two claim the same route name', () => {
		expect(() =>
			assertUniqueRouteNames([
				moduleWith('otel', [route('Shared')]),
				moduleWith('insights', [route('Shared')]),
			]),
		).toThrow('Duplicate route name "Shared" from module "insights" (already declared by "otel").');
	});

	it('should throw when one module declares the same route name twice', () => {
		expect(() =>
			assertUniqueRouteNames([moduleWith('otel', [route('Twice'), route('Twice')])]),
		).toThrow('Duplicate route name "Twice" from module "otel" (already declared by "otel").');
	});

	it('should detect a collision between a nested child route and a top-level route', () => {
		expect(() =>
			assertUniqueRouteNames([
				moduleWith('chat', [route('ChatView', [route('Nested')])]),
				moduleWith('agents', [route('Nested')]),
			]),
		).toThrow('Duplicate route name "Nested" from module "agents" (already declared by "chat").');
	});

	it('should ignore unnamed routes, which vue-router matches by path only', () => {
		const unnamed = { path: 'a', component } as RouteRecordRaw;

		expect(() =>
			assertUniqueRouteNames([moduleWith('a', [unnamed]), moduleWith('b', [unnamed])]),
		).not.toThrow();
	});
});
