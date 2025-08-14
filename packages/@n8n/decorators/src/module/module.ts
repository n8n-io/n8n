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

export interface ModuleInterface {
	init?(): Promise<void>;
	shutdown?(): Promise<void>;
	entities?(): Promise<EntityClass[]>;
	settings?(): Promise<ModuleSettings>;

	/**
	 * @returns Path to a dir to load nodes and credentials from.
	 * @example '/Users/nathan/.n8n/nodes/node_modules'
	 */
	loadDir?(): string;
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
