import { sublimeSearch } from '@/utils';
import { INodeCreateElement } from '@/Interface';

export const useNodesSearch = () => {
	function searchNodes(searchFilter: string, items: INodeCreateElement[]) {
		// In order to support the old search we need to remove the 'trigger' part
		const trimmedFilter = searchFilter.toLowerCase().replace('trigger', '');
		const result = (
			sublimeSearch<INodeCreateElement>(trimmedFilter, items, [
				{ key: 'properties.displayName', weight: 2 },
				{ key: 'properties.codex.alias', weight: 1 },
			]) || []
		).map(({ item }) => item);

		return result;
	}

	return {
		searchNodes,
	};
};
