import { IconParameterModule } from './icon-parameter.module';

describe('IconParameterModule', () => {
	it('claims the icon parameter type', () => {
		expect(IconParameterModule.parameterInputs).toHaveLength(1);
		expect(IconParameterModule.parameterInputs?.[0].type).toBe('icon');
	});

	// The shell owns expression rendering, the from-AI override and the drop target for
	// this type. Declaring any flag here would change behaviour the built-in branch had.
	it('declares no capabilities', () => {
		expect(IconParameterModule.parameterInputs?.[0].capabilities).toBeUndefined();
	});

	// Import-light: the descriptor must not pull the component into the shell chunk.
	it('loads the component lazily', () => {
		expect(typeof IconParameterModule.parameterInputs?.[0].component).toBe('function');
	});

	it('contributes no other surface', () => {
		expect(IconParameterModule.routes).toBeUndefined();
		expect(IconParameterModule.settingsPages).toBeUndefined();
		expect(IconParameterModule.modals).toBeUndefined();
	});
});
