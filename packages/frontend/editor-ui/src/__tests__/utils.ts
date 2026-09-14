import { within, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import type { ISettingsState } from '@/Interface';
import { AuthenticationMethod } from '@n8n/api-types';
import { defaultSettings } from '@n8n/frontend-test-utils';

// `mockedStore`, `retry`, `waitAllPromises` and `useEmitters` now live in
// `@n8n/frontend-test-utils`, so a module package can reach them. They are re-exported rather
// than codemodded away: `mockedStore` alone has 200+ importers here, and this file stays for the
// helpers below it that are bound to the shell (`ISettingsState`) or to editor-ui's own DOM.
export {
	mockedStore,
	retry,
	useEmitters,
	waitAllPromises,
	type Emitter,
	type Emitters,
	type MockedStore,
} from '@n8n/frontend-test-utils';

export const SETTINGS_STORE_DEFAULT_STATE: ISettingsState = {
	initialized: true,
	settings: defaultSettings,
	userManagement: {
		showSetupOnFirstLoad: false,
		smtpSetup: false,
		authenticationMethod: AuthenticationMethod.Email,
		quota: defaultSettings.userManagement.quota,
		passwordMinLength: 8,
	},
	templatesEndpointHealthy: false,
	api: {
		enabled: false,
		latestVersion: 0,
		path: '/',
		swaggerUi: {
			enabled: false,
		},
	},
	ldap: {
		loginLabel: '',
		loginEnabled: false,
	},
	saml: {
		loginLabel: '',
		loginEnabled: false,
	},
	mfa: {
		enabled: false,
	},
	saveDataErrorExecution: 'all',
	saveDataSuccessExecution: 'all',
	saveDataProgressExecution: false,
	saveManualExecutions: false,
};

export const getDropdownItems = async (dropdownTriggerParent: HTMLElement) => {
	await userEvent.click(within(dropdownTriggerParent).getByRole('combobox'));
	const selectTrigger = dropdownTriggerParent.querySelector(
		'.select-trigger[aria-describedby]',
	) as HTMLElement;
	await waitFor(() => expect(selectTrigger).toBeInTheDocument());

	const selectDropdownId = selectTrigger.getAttribute('aria-describedby');
	const selectDropdown = document.getElementById(selectDropdownId as string) as HTMLElement;
	await waitFor(() => expect(selectDropdown).toBeInTheDocument());

	return selectDropdown.querySelectorAll('.el-select-dropdown__item');
};

export const getSelectedDropdownValue = async (items: NodeListOf<Element>) => {
	const selectedItem = Array.from(items).find((item) => item.classList.contains('selected'));
	expect(selectedItem).toBeInTheDocument();
	return selectedItem?.querySelector('p')?.textContent?.trim();
};

/**
 * Helper to get the visible tooltip content container.
 * Queries the tooltip by its CSS class which is applied by N8nTooltip component.
 * This is the semantic approach since .n8n-tooltip is the design system class.
 *
 * Usage: const tooltip = getTooltip(); expect(tooltip).toHaveTextContent('...');
 */
export const getTooltip = () => {
	const tooltip = document.querySelector('.n8n-tooltip');
	if (!tooltip) {
		throw new Error('Unable to find tooltip with class .n8n-tooltip');
	}
	return tooltip as HTMLElement;
};

/**
 * Query version that returns null if not found
 */
export const queryTooltip = () => document.querySelector('.n8n-tooltip');

/**
 * Get a within() wrapper for querying inside the tooltip
 */
export const withinTooltip = () => within(getTooltip());

/**
 * Triggers tooltip hover by dispatching a proper pointermove event.
 * Works with Reka UI tooltips in JSDOM by setting correct pointerType.
 *
 * Automatically finds the actual tooltip trigger element (with data-grace-area-trigger)
 * if the passed element is a parent container.
 *
 * Requires PointerEvent polyfill in setup.ts (already configured).
 *
 * @example
 * const button = getByRole('button');
 * await hoverTooltipTrigger(button);
 * await waitFor(() => expect(getTooltip()).toHaveTextContent('Expected text'));
 */
export const hoverTooltipTrigger = async (element: Element): Promise<void> => {
	// Find actual tooltip trigger - check element, children, then ancestors
	let trigger: Element = element;

	if (element.hasAttribute('data-grace-area-trigger')) {
		trigger = element;
	} else {
		// Check children first
		const childTrigger = element.querySelector('[data-grace-area-trigger]');
		if (childTrigger) {
			trigger = childTrigger;
		} else {
			// Check ancestors
			const ancestorTrigger = element.closest('[data-grace-area-trigger]');
			if (ancestorTrigger) {
				trigger = ancestorTrigger;
			}
		}
	}

	const event = new PointerEvent('pointermove', {
		bubbles: true,
		cancelable: true,
		pointerType: 'mouse',
		clientX: 100,
		clientY: 100,
	});

	trigger.dispatchEvent(event);
	// Allow Vue reactivity and Reka UI to process
	await new Promise((r) => setTimeout(r, 10));
};
