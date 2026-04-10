export { createDomainAccessTracker } from './domain-access-tracker';
export type { DomainAccessTracker } from './domain-access-tracker';
export {
	checkDomainAccess,
	applyDomainAccessResume,
	domainGatingSuspendSchema,
	domainGatingResumeSchema,
} from './domain-gating';
export type { DomainGatingCheck } from './domain-gating';
