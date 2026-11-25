import { within } from '@testing-library/vue';

type GetByTestId = (id: string) => HTMLElement;
type GetByRole = (role: string, options?: object) => HTMLElement;

/** The trigger of the access filter of the instance policy table. */
export const accessFilter = (getByRole: GetByRole) =>
	getByRole('combobox', { name: 'Filter by access' });

/** Cell lookups in the instance policy table, for the row of `defaultName` unless a name is given. */
export function policyTableCells(defaultName: string) {
	const accessCell = (getByTestId: GetByTestId, name = defaultName) =>
		getByTestId(`instance-policy-access-${name}`);

	/** Projects, Uses, Workflows and Active workflows. The cells before them are Name and Access. */
	const usageCells = (getByTestId: GetByTestId, name = defaultName) =>
		within(accessCell(getByTestId, name).closest('tr') as HTMLElement)
			.getAllByRole('cell')
			.slice(2)
			.map((cell) => cell.textContent?.trim());

	return { accessCell, usageCells };
}
