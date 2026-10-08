import { describe, it, expect } from 'vitest';
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router';

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
	({ path: `/${name.toLowerCase()}`, name, component, children }) as RouteRecordRaw;

/** A router holding the given routes, standing in for the shell's own. */
const shellRouter = (routes: RouteRecordRaw[] = []) =>
	createRouter({ history: createMemoryHistory(), routes });

describe('assertUniqueRouteNames', () => {
	it('should accept modules with distinct route names', () => {
		expect(() =>
			assertUniqueRouteNames(
				[
					moduleWith('otel', [route('SettingsOpenTelemetryView')]),
					moduleWith('mcp', [route('McpSettings')]),
				],
				shellRouter(),
			),
		).not.toThrow();
	});

	it('should accept modules that declare no routes', () => {
		expect(() =>
			assertUniqueRouteNames([{ id: 'a', name: 'a', description: '', icon: 'box' }], shellRouter()),
		).not.toThrow();
	});

	it('should throw and name both modules when two claim the same route name', () => {
		expect(() =>
			assertUniqueRouteNames(
				[moduleWith('otel', [route('Shared')]), moduleWith('insights', [route('Shared')])],
				shellRouter(),
			),
		).toThrow(
			'Duplicate route name "Shared" declared by module "insights" — already taken by module "otel".',
		);
	});

	it('should throw when one module declares the same route name twice', () => {
		expect(() =>
			assertUniqueRouteNames([moduleWith('otel', [route('Twice'), route('Twice')])], shellRouter()),
		).toThrow(
			'Duplicate route name "Twice" declared by module "otel" — already taken by module "otel".',
		);
	});

	it('should detect a collision between a nested child route and a top-level route', () => {
		expect(() =>
			assertUniqueRouteNames(
				[
					moduleWith('chat', [route('ChatView', [route('Nested')])]),
					moduleWith('agents', [route('Nested')]),
				],
				shellRouter(),
			),
		).toThrow(
			'Duplicate route name "Nested" declared by module "agents" — already taken by module "chat".',
		);
	});

	it('should ignore unnamed routes, which vue-router matches by path only', () => {
		const unnamed = { path: '/a', component } as RouteRecordRaw;

		expect(() =>
			assertUniqueRouteNames(
				[moduleWith('a', [unnamed]), moduleWith('b', [unnamed])],
				shellRouter(),
			),
		).not.toThrow();
	});

	describe('against the shell', () => {
		it('should throw when a module claims a name the shell already registered', () => {
			expect(() =>
				assertUniqueRouteNames(
					[moduleWith('otel', [route('Workflows')])],
					shellRouter([route('Workflows')]),
				),
			).toThrow(
				'Duplicate route name "Workflows" declared by module "otel" — already taken by the app shell.',
			);
		});

		it('should throw when a module claims the name of a nested shell route', () => {
			expect(() =>
				assertUniqueRouteNames(
					[moduleWith('otel', [route('ExecutionPreview')])],
					shellRouter([route('WorkflowExecutions', [route('ExecutionPreview')])]),
				),
			).toThrow(
				'Duplicate route name "ExecutionPreview" declared by module "otel" — already taken by the app shell.',
			);
		});

		it('should report the shell as the owner even when another module also wants the name', () => {
			expect(() =>
				assertUniqueRouteNames(
					[moduleWith('otel', [route('Settings')]), moduleWith('mcp', [route('Settings')])],
					shellRouter([route('Settings')]),
				),
			).toThrow(
				'Duplicate route name "Settings" declared by module "otel" — already taken by the app shell.',
			);
		});

		it('should accept module names that no shell route uses', () => {
			expect(() =>
				assertUniqueRouteNames(
					[moduleWith('otel', [route('SettingsOpenTelemetryView')])],
					shellRouter([route('Settings'), route('Workflows')]),
				),
			).not.toThrow();
		});
	});
});
