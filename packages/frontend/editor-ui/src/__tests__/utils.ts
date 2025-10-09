import { within, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import type { ISettingsState } from '@/Interface';
import { UserManagementAuthenticationMethod } from '@/Interface';
import { defaultSettings } from './defaults';
import type { Mock } from 'vitest';
import type { Store, StoreDefinition } from 'pinia';
import type { ComputedRef } from 'vue';

/**
 * Retries the given assertion until it passes or the timeout is reached
 *
 * @example
 * await retry(
 *   () => expect(screen.getByText('Hello')).toBeInTheDocument()
 * );
 */
export const retry = async (assertion: () => void, { interval = 20, timeout = 1000 } = {}) => {
	return await new Promise((resolve, reject) => {
		const startTime = Date.now();

		const tryAgain = () => {
			setTimeout(() => {
				try {
					resolve(assertion());
				} catch (error) {
					if (Date.now() - startTime > timeout) {
						reject(error);
					} else {
						tryAgain();
					}
				}
			}, interval);
		};

		tryAgain();
	});
};

export const waitAllPromises = async () => await new Promise((resolve) => setTimeout(resolve));

export const SETTINGS_STORE_DEFAULT_STATE: ISettingsState = {
	initialized: true,
	settings: defaultSettings,
	userManagement: {
		showSetupOnFirstLoad: false,
		smtpSetup: false,
		authenticationMethod: UserManagementAuthenticationMethod.Email,
		quota: defaultSettings.userManagement.quota,
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
 * Typescript helper for mocking pinia store actions return value
 *
 * @see https://pinia.vuejs.org/cookbook/testing.html#Mocking-the-returned-value-of-an-action
 */
export const mockedStore = <TStoreDef extends () => unknown>(
	useStore: TStoreDef,
): TStoreDef extends StoreDefinition<infer Id, infer State, infer Getters, infer Actions>
	? Store<
			Id,
			State,
			Record<string, never>,
			{
				[K in keyof Actions]: Actions[K] extends (...args: infer Args) => infer ReturnT
					? Mock<(...args: Args) => ReturnT>
					: Actions[K];
			}
		> & {
			[K in keyof Getters]: Getters[K] extends ComputedRef<infer T> ? T : never;
		}
	: ReturnType<TStoreDef> => {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return useStore() as any;
};

export type MockedStore<T extends () => unknown> = ReturnType<typeof mockedStore<T>>;

export type Emitter = (event: string, ...args: unknown[]) => void;
export type Emitters<T extends string> = Record<
	T,
	{
		emit: Emitter;
	}
>;
export const useEmitters = <T extends string>() => {
	const emitters = {} as Emitters<T>;
	return {
		emitters,
		addEmitter: (name: T, emitter: Emitter) => {
			emitters[name] = { emit: emitter };
		},
	};
};
