export interface ISearchConditions {
	field?: string;
	condition_type?: string;
	value?: string;
	value2?: string;
}

export interface IFilterRules {
	LHS?: string;
	CONDITION?: string;
	RHS?: string;
	RHS_NEW?: string;
}

export interface IFilter {
	or_rules?: IFilterRules;
	rules?: IFilterRules;
	contact_type?: string;
}
