export interface SystemAnalyticsQueryDto {
	timeRange?: string;
}

export interface SystemAnalyticsResponseDto {
	success: boolean;
	data: any;
	metadata: {
		requestedAt: string;
		timeRange: { start: Date; end: Date };
		userId: string;
	};
}

export interface NodeErrorBreakdownQueryDto {
	timeRange?: string;
}

export interface NodeErrorBreakdownResponseDto {
	success: boolean;
	data: any;
	metadata: {
		requestedAt: string;
		nodeType: string;
		timeRange: { start: Date; end: Date };
		userId: string;
	};
}

export interface NodeTypeAnalyticsQueryDto {
	timeRange?: string;
}

export interface NodeTypeAnalyticsResponseDto {
	success: boolean;
	data: any;
	metadata: {
		requestedAt: string;
		nodeType: string;
		timeRange: { start: Date; end: Date };
		userId: string;
	};
}

export interface NodeTypesListResponseDto {
	success: boolean;
	data: any[];
	metadata: {
		requestedAt: string;
		timeRange: { start: Date; end: Date };
		total: number;
		userId: string;
	};
}

export interface NodeComparisonQueryDto {
	nodeTypes: string[];
	timeRange?: string;
}

export interface NodeComparisonResponseDto {
	success: boolean;
	data: any;
	metadata: {
		requestedAt: string;
		nodeTypes: string[];
		timeRange: { start: Date; end: Date };
		userId: string;
	};
}

export interface ErrorPatternsQueryDto {
	nodeTypes?: string[];
	timeRange?: string;
}

export interface ErrorPatternsResponseDto {
	success: boolean;
	data: any[];
	metadata: {
		requestedAt: string;
		nodeTypes?: string[];
		timeRange: { start: Date; end: Date };
		totalPatterns: number;
		userId: string;
	};
}

export interface PerformanceCorrelationQueryDto {
	timeRange?: string;
}

export interface PerformanceCorrelationResponseDto {
	success: boolean;
	data: any;
	metadata: {
		requestedAt: string;
		nodeType: string;
		timeRange: { start: Date; end: Date };
		userId: string;
	};
}
