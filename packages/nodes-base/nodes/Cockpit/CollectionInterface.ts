export interface ICollection {
	fields?: object;
	filter?: object;
	limit?: number;
	skip?: number;
	sort?: object;
	populate?: boolean;
	simple?: boolean;
	lang?: string;
	data?: object;
}
