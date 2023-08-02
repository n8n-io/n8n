import type { PropType } from 'vue';
import { defineComponent, h } from 'vue';
import type { DatatableRow } from '../../../types';
import N8nButton from '../../N8nButton';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const ActionComponent = defineComponent({
	props: {
		row: {
			type: Object as PropType<DatatableRow>,
			default: () => ({}),
		},
	},
	setup(props) {
		return () => h(N8nButton, {}, [`Button ${props.row.id}`]);
	},
});

export const columns = [
	{ id: 'id', path: 'id', label: 'ID' },
	{ id: 'name', path: 'name', label: 'Name' },
	{ id: 'age', path: 'meta.age', label: 'Age' },
	{
		id: 'action',
		label: 'Action',
		render: ActionComponent,
	},
];

export const rows = [
	{ id: 1, name: 'Richard Hendricks', meta: { age: 29 } },
	{ id: 2, name: 'Bertram Gilfoyle', meta: { age: 44 } },
	{ id: 3, name: 'Dinesh Chugtai', meta: { age: 31 } },
	{ id: 4, name: 'Jared Dunn ', meta: { age: 38 } },
	{ id: 5, name: 'Richard Hendricks', meta: { age: 29 } },
	{ id: 6, name: 'Bertram Gilfoyle', meta: { age: 44 } },
	{ id: 7, name: 'Dinesh Chugtai', meta: { age: 31 } },
	{ id: 8, name: 'Jared Dunn ', meta: { age: 38 } },
	{ id: 9, name: 'Richard Hendricks', meta: { age: 29 } },
	{ id: 10, name: 'Bertram Gilfoyle', meta: { age: 44 } },
	{ id: 11, name: 'Dinesh Chugtai', meta: { age: 31 } },
	{ id: 12, name: 'Jared Dunn ', meta: { age: 38 } },
	{ id: 13, name: 'Richard Hendricks', meta: { age: 29 } },
	{ id: 14, name: 'Bertram Gilfoyle', meta: { age: 44 } },
	{ id: 15, name: 'Dinesh Chugtai', meta: { age: 31 } },
];
