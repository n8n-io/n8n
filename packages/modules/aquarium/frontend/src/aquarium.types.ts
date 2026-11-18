import type { IRestApiContext } from '@n8n/rest-api-client';
import type { RouteLocationRaw } from 'vue-router';

export type EntityKind = 'workflow' | 'agent';

/** The raw numbers that shape a creature. A source sets only the values it knows. */
export interface EntityMetrics {
	/** Nodes of a workflow, or skills of an agent. */
	complexity: number;
	executionCount: number;
	failedCount: number;
	averageRunTimeMs: number;
}

/** One workflow or agent in the tank. */
export interface AquariumEntity {
	/** Unique across kinds: `${kind}:${id}`. */
	key: string;
	id: string;
	kind: EntityKind;
	name: string;
	/** Where a click on the creature goes. */
	route?: RouteLocationRaw;
	metrics: EntityMetrics;
}

export interface EntityMetricsPatch {
	key: string;
	metrics: Partial<EntityMetrics>;
}

export interface AquariumSourceContext {
	restApiContext: IRestApiContext;
}

/** Adds entities to the tank. */
export interface EntitySource {
	id: string;
	load(context: AquariumSourceContext): Promise<AquariumEntity[]>;
}

/** Adds metrics to entities that an entity source loaded. Later sources win. */
export interface MetricsSource {
	id: string;
	load(context: AquariumSourceContext): Promise<EntityMetricsPatch[]>;
}

export type SizeTier = 'tiny' | 'small' | 'medium' | 'large' | 'huge';

/** What a creature looks like and how it moves. Trait rules derive it from an entity. */
export interface CreatureTraits {
	speciesId: string;
	sizeTier: SizeTier;
	/** Integer pixel multiplier of the sprite. */
	scale: number;
	/** Logical pixels per second. */
	speed: number;
	/** CSS colour blended over the sprite. */
	tint?: string;
	/** Ids of effects in the effect registry. */
	effects: string[];
}
