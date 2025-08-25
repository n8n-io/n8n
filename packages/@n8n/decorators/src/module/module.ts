import type { LICENSE_FEATURES } from '@n8n/constants';
import { Container, Service, type Constructable } from '@n8n/di';

import { ModuleMetadata } from './module-metadata';

/**
 * Structurally similar (not identical) interface to typeorm's `BaseEntity`
 * to prevent importing `@n8n/typeorm` into `@n8n/decorators`.
 */
export interface BaseEntity {
	hasId(): boolean;
	save(options?: unknown): Promise<this>;
	remove(options?: unknown): Promise<this>;
	softRemove(options?: unknown): Promise<this>;
	recover(options?: unknown): Promise<this>;
	reload(): Promise<void>;
}

export interface TimestampedEntity {
	id: string;
	createdAt: Date;
	updatedAt: Date;
}

export type EntityClass = new () => BaseEntity | TimestampedEntity;

export type ModuleSettings = Record<string, unknown>;
export type ModuleContext = Record<string, unknown>;

export interface ModuleInterface {
	init?(): Promise<void>;
	shutdown?(): Promise<void>;

	/**
	 * Return a list of entities to register with the typeorm database connection.
	 *
	 * @example [ InsightsByPeriod, InsightsMetadata, InsightsRaw ]
	 */
	entities?(): Promise<EntityClass[]>;

	/**
	 * Return an object with settings to send to the client via `/module-settings`.
	 *
	 * @example { summary: true, dashboard: false }
	 */
	settings?(): Promise<ModuleSettings>;

	/**
	 * Return an object to merge into workflow context, a.k.a. `WorkflowExecuteAdditionalData`.
	 * This object will be namespaced under the module name set by `@BackendModule('name')`.
	 *
	 * @example
	 * ```ts
	 * // at Module.context()
	 * { proxy: Container.get(InsightsProxyService) }
	 *
	 * // at callsite
	 * additionalData.insights.proxy.method()
	 * ```
	 *
	 * For type safety, add the module context to `IWorkflowExecuteAdditionalData`.
	 *
	 * ```ts
	 * export interface IWorkflowExecuteAdditionalData {
	 *   insights?: {
	 *     proxy: { method: () => void };
	 *   };
	 * }
	 * ```
	 */
	context?(): Promise<ModuleContext>;

	/**
	 * Return a path to a dir to load nodes and credentials from.
	 *
	 * @returns Path to a dir to load nodes and credentials from. `null` to skip.
	 * @example '/Users/nathan/.n8n/nodes/node_modules'
	 */
	loadDir?(): Promise<string | null>;
}

export type ModuleClass = Constructable<ModuleInterface>;

export type LicenseFlag = (typeof LICENSE_FEATURES)[keyof typeof LICENSE_FEATURES];

export const BackendModule =
	(opts: { name: string; licenseFlag?: LicenseFlag }): ClassDecorator =>
	(target) => {
		Container.get(ModuleMetadata).register(opts.name, {
			class: target as unknown as ModuleClass,
			licenseFlag: opts?.licenseFlag,
		});

		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return Service()(target);
	};
