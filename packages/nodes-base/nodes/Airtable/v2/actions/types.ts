export type Table = {
	id: string;
	name: string;
	fields: Field[];
};

export type TablesResponse = {
	tables: Table[];
};

export type Field = {
	id: string;
	name: string;
	type: string;
};
