import { Service } from '@n8n/di';
import { ActiveWorkflowTriggers } from 'n8n-core';

/**
 * The in-memory registry of leased triggers on this main, separate from the one
 * the leader's publication path reconciles, sweeps and tears down.
 */
@Service()
export class LeasedTriggerRegistry extends ActiveWorkflowTriggers {}
