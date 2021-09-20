export interface ISearchConditions {
	filterType?: string;
	searchOperation?: string;
	value?: string;
}

export interface IFilterRules {
	LHS?: string;
	CONDITION?: string;
	RHS?: string;
}

export interface IFilter {
	or_rules?: IFilterRules;
	rules?: IFilterRules;
	contact_type?: string;
}
