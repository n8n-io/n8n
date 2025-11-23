import type { Component, VNode } from 'vue';

export type DatatableRowDataType = string | number | boolean | null | undefined;

export interface DatatableRow {
	id: string | number;
	[key: string]: unknown;
}

export interface DatatableColumn {
	id: string | number;
	path: string;
	label: string;
	classes?: string[];
	width?: string;
	render?: Component | ((row: DatatableRow) => (() => VNode | VNode[]) | DatatableRowDataType);
}
