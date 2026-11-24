import { describeSkillUsageContract, FakeSkillUsage } from '../testing';

describe('FakeSkillUsage', () => {
	let usage: FakeSkillUsage;

	beforeEach(() => {
		usage = new FakeSkillUsage();
	});

	describeSkillUsageContract(() => ({ usage, seed: async (world) => await usage.seed(world) }));
});
