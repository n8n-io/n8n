import { mock } from 'vitest-mock-extended';
import { describe, it, expect } from 'vitest';
import { effectScope } from 'vue';
import type { FrontendSettings } from '@n8n/api-types';
import { claimDocumentTitle, useDocumentTitle } from './useDocumentTitle';

const settings = mock<FrontendSettings>({ releaseChannel: 'stable' });
vi.mock('@n8n/stores/settings.store', () => ({
	useSettingsStore: vi.fn(() => ({ settings })),
}));

describe('useDocumentTitle', () => {
	it('should set the document title', () => {
		const { set } = useDocumentTitle();
		set('Test Title');
		expect(document.title).toBe('Test Title - n8n');
	});

	it('should reset the document title', () => {
		const { set, reset } = useDocumentTitle();
		set('Test Title');
		reset();
		expect(document.title).toBe('Workflow Automation - n8n');
	});

	it('should use the correct prefix for the release channel', () => {
		settings.releaseChannel = 'beta';
		const { set } = useDocumentTitle();
		set('Test Title');
		expect(document.title).toBe('Test Title - n8n[BETA]');
	});

	describe('setDocumentTitle', () => {
		beforeEach(() => {
			settings.releaseChannel = 'stable';
		});

		it('should set document title with IDLE status', () => {
			const { setDocumentTitle } = useDocumentTitle();
			setDocumentTitle('My Workflow', 'IDLE');
			expect(document.title).toBe('▶️ My Workflow - n8n');
		});

		it('should set document title with EXECUTING status', () => {
			const { setDocumentTitle } = useDocumentTitle();
			setDocumentTitle('My Workflow', 'EXECUTING');
			expect(document.title).toBe('🔄 My Workflow - n8n');
		});

		it('should set document title with ERROR status', () => {
			const { setDocumentTitle } = useDocumentTitle();
			setDocumentTitle('My Workflow', 'ERROR');
			expect(document.title).toBe('⚠️ My Workflow - n8n');
		});

		it('should set document title with DEBUG status', () => {
			const { setDocumentTitle } = useDocumentTitle();
			setDocumentTitle('My Workflow', 'DEBUG');
			expect(document.title).toBe('⚠️ My Workflow - n8n');
		});

		it('should set document title with AI_BUILDING status', () => {
			const { setDocumentTitle } = useDocumentTitle();
			setDocumentTitle('My Workflow', 'AI_BUILDING');
			expect(document.title).toBe('[Building] My Workflow - n8n');
		});

		it('should set document title with AI_DONE status', () => {
			const { setDocumentTitle } = useDocumentTitle();
			setDocumentTitle('My Workflow', 'AI_DONE');
			expect(document.title).toBe('[Done] My Workflow - n8n');
		});
	});

	describe('getDocumentState', () => {
		beforeEach(() => {
			settings.releaseChannel = 'stable';
		});

		it('should return undefined initially', () => {
			const { getDocumentState } = useDocumentTitle();
			expect(getDocumentState()).toBeUndefined();
		});

		it('should return the current state after setDocumentTitle is called', () => {
			const { setDocumentTitle, getDocumentState } = useDocumentTitle();
			setDocumentTitle('My Workflow', 'AI_BUILDING');
			expect(getDocumentState()).toBe('AI_BUILDING');
		});

		it('should track state changes', () => {
			const { setDocumentTitle, getDocumentState } = useDocumentTitle();

			setDocumentTitle('My Workflow', 'IDLE');
			expect(getDocumentState()).toBe('IDLE');

			setDocumentTitle('My Workflow', 'AI_BUILDING');
			expect(getDocumentState()).toBe('AI_BUILDING');

			setDocumentTitle('My Workflow', 'AI_DONE');
			expect(getDocumentState()).toBe('AI_DONE');
		});

		it('should return undefined after reset is called', () => {
			const { setDocumentTitle, getDocumentState, reset } = useDocumentTitle();

			setDocumentTitle('My Workflow', 'AI_DONE');
			expect(getDocumentState()).toBe('AI_DONE');

			reset();
			expect(getDocumentState()).toBeUndefined();
		});
	});

	describe('claimDocumentTitle', () => {
		beforeEach(() => {
			settings.releaseChannel = 'stable';
		});

		it('should ignore workflow title updates while a host owns the title', () => {
			const scope = effectScope();
			scope.run(() => claimDocumentTitle());

			const { set, setDocumentTitle } = useDocumentTitle();
			set('My conversation');
			setDocumentTitle('My Workflow', 'IDLE');

			expect(document.title).toBe('My conversation - n8n');
			scope.stop();
		});

		it('should apply workflow title updates again once the host releases the title', () => {
			const scope = effectScope();
			scope.run(() => claimDocumentTitle());
			scope.stop();

			useDocumentTitle().setDocumentTitle('My Workflow', 'IDLE');

			expect(document.title).toBe('▶️ My Workflow - n8n');
		});

		it('should keep the title owned while a second host instance still holds it', () => {
			// A transient remount claims from the new instance before the old one disposes
			const outgoing = effectScope();
			outgoing.run(() => claimDocumentTitle());
			const incoming = effectScope();
			incoming.run(() => claimDocumentTitle());
			outgoing.stop();

			const { set, setDocumentTitle } = useDocumentTitle();
			set('My conversation');
			setDocumentTitle('My Workflow', 'IDLE');

			expect(document.title).toBe('My conversation - n8n');
			incoming.stop();
		});
	});
});
