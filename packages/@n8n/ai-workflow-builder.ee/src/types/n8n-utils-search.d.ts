// packages/@n8n/ai-workflow-builder.ee/src/types/n8n-utils-search.d.ts

declare module '@n8n/utils/search/sublimeSearch' {
	// 不关心参数/返回值具体长什么样，全部放宽为 any
	// 主要目的是让 TS 不再报错
	export function sublimeSearch(...args: any[]): any;
}
