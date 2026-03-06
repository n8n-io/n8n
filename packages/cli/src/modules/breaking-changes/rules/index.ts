import { v2Rules } from './v2';

const allRules = [...v2Rules];
type RuleConstructors = (typeof allRules)[number];
type RuleInstances = InstanceType<RuleConstructors>;

export { allRules, type RuleInstances };
