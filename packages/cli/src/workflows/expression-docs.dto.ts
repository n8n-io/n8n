// Query DTOs for expression endpoints
export interface ExpressionFunctionsCategoryQueryDto {
	search?: string;
}

export interface ExpressionVariablesContextQueryDto {
	context?: string;
}

export interface ExpressionFunctionDto {
	name: string;
	description?: string;
	returnType: string;
	category: string;
	section?: string;
	hidden?: boolean;
	aliases?: string[];
	args?: Array<{
		name: string;
		type?: string;
		optional?: boolean;
		variadic?: boolean;
		description?: string;
		default?: string;
	}>;
	examples?: Array<{
		example: string;
		evaluated?: string;
		description?: string;
	}>;
	docURL?: string;
}

export interface ExpressionVariableDto {
	name: string;
	type: string;
	description?: string;
	context: string;
	examples?: Array<{
		example: string;
		description?: string;
	}>;
}

export interface ExpressionCategoryDto {
	name: string;
	description: string;
	functionCount: number;
}

export interface ExpressionFunctionsResponseDto {
	functions: ExpressionFunctionDto[];
	category: string;
	total: number;
}

export interface ExpressionVariablesResponseDto {
	variables: ExpressionVariableDto[];
	context?: string;
	total: number;
}

export interface ExpressionCategoriesResponseDto {
	categories: ExpressionCategoryDto[];
	total: number;
}
