import type { RouteRecordRaw } from 'vue-router';

export const getPathAsRegexPattern = (path: RouteRecordRaw['path']) =>
	path.replace(/:\w+/g, '[^/]+');
