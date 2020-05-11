export interface IDealCustomProperty {
	name: string;
	value: string;
}

export interface IDeal {
	id?: number;
	expected_value?: number;
	probability?: number;
	name?: string;
	close_date?: number;
	milestone?: string;
	contactIds?: string[];
	customData?: IDealCustomProperty[];
}
