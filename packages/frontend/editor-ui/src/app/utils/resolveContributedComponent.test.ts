import { defineComponent, type Component } from 'vue';

import { resolveContributedComponent } from '@/app/utils/resolveContributedComponent';

const stubComponent = defineComponent({ name: 'StubComponent', template: '<div />' });

describe('resolveContributedComponent', () => {
	it('returns a component unchanged', () => {
		expect(resolveContributedComponent(stubComponent)).toBe(stubComponent);
	});

	it('returns the same wrapper for each call with one factory', () => {
		const factory = async (): Promise<Component> => stubComponent;

		expect(resolveContributedComponent(factory)).toBe(resolveContributedComponent(factory));
	});

	it('returns a different wrapper for a different factory', () => {
		const first = async (): Promise<Component> => stubComponent;
		const second = async (): Promise<Component> => stubComponent;

		expect(resolveContributedComponent(first)).not.toBe(resolveContributedComponent(second));
	});
});
