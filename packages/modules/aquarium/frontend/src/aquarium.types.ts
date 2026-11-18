import type { IRestApiContext } from '@n8n/rest-api-client';
import type { RouteLocationRaw } from 'vue-router';

export type EntityKind = 'workflow' | 'agent';

export interface EntityProject {
	id: string;
	name: string;
	/** `personal` or `team` on n8n. Other sources can leave it out. */
	type?: string;
	/**
	 * The current account is a direct member: it has a project role, not only a global role that
	 * can see every project. Undefined when the source does not know.
	 */
	isMember?: boolean;
}

/** `single` shows one tank. `project` shows one tank for each project. */
export type TankGrouping = 'single' | 'project';

/** The raw numbers that shape a creature. A source sets only the values it knows. */
export interface EntityMetrics {
	/** Nodes of a workflow, or skills of an agent. */
	complexity: number;
	executionCount: number;
	failedCount: number;
	averageRunTimeMs: number;
	/** Security checks that the workflow fails, from 0 to 3. Undefined when not checked. */
	securityRisks?: number;
	/** Runs that are paused, waiting to go on. They are not failures. */
	waitingCount: number;
	/**
	 * Runs that ended: success, error, crash or cancel. Sources count runs in different ways, so
	 * compare paused runs with this, not with `executionCount`.
	 */
	finishedCount: number;
}

/** How a workflow is built. Read from its nodes and settings; see `engine/design.ts`. */
export interface WorkflowDesign {
	/** Nodes without sticky notes. */
	nodeCount: number;
	/** Code, Function and AI code nodes. */
	codeNodeCount: number;
	/** If, Switch and Merge nodes. */
	branchNodeCount: number;
	disabledNodeCount: number;
	/** Nodes with the same type and parameters as an earlier node: likely copy and paste. */
	duplicateNodeCount: number;
	/** Execute Workflow nodes and workflow tools. */
	subWorkflowCallCount: number;
	/** Wait and Form nodes, and nodes that send and wait for a reply. */
	waitNodeCount: number;
	/** A workflow runs when this one fails. */
	hasErrorWorkflow: boolean;
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
	/** The project that owns the entity. Entities without one share a tank in project view. */
	project?: EntityProject;
	/** Only for workflows, when the source has their nodes. */
	design?: WorkflowDesign;
	/** ISO timestamp. Only when the source knows it. */
	createdAt?: string;
	metrics: EntityMetrics;
}

/**
 * Live run counts from the backend. They change every few seconds, so they reach creatures
 * directly and do not go through the trait rules.
 */
export interface EntityActivity {
	/** Runs that started and did not end yet. */
	running: number;
	/** Counts for the last `windowSeconds` of the activity snapshot. */
	started: number;
	succeeded: number;
	failed: number;
	/** Runs that are paused now, waiting to go on. Not a failure. */
	waiting: number;
	/** Pauses in the window. */
	paused: number;
	/** Starts in each full second of the window, oldest first. The current second is not in it. */
	startedPerSecond: number[];
	/** Time of the last start or end, in ms. */
	lastEventAt: number;
}

export interface ActivitySnapshot {
	windowSeconds: number;
	/** Keyed like `AquariumEntity.key`. Entities with no recent runs are absent. */
	byKey: Map<string, EntityActivity>;
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
	/**
	 * Seconds between glitches. A glitch shows the tint for a moment, with a 1 px offset and
	 * scrambled rows. Without it, the tint stays on.
	 */
	glitchEverySeconds?: number;
	/** Draws the species in bone colours with ribs. It overrides the tint and belly-up. */
	skeleton?: boolean;
	/** Floats upside down at the surface. It overrides the tint. */
	bellyUp?: boolean;
	/** Turns to look the other way every few seconds, as if lost. */
	lookAround?: boolean;
	/** A wave of gold sweeps over the creature while its workflow runs (live activity). */
	shimmer?: boolean;
	/** Multiplies the whole swim speed, live boost included. Without it, the factor is 1. */
	speedFactor?: number;
	/** A cat on the tank frame watches the creature: its workflow has a security risk. */
	watchedByCat?: boolean;
	/** Ids of effects in the effect registry. */
	effects: string[];
	/**
	 * The entity has never run: the creature does not move or animate, until live activity shows a
	 * run. Unset for agents, whose run count is not known yet.
	 */
	still?: boolean;
}
