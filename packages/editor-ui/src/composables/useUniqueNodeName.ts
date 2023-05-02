import { useWorkflowsStore } from '@/stores/workflows';
import { useNodeTypesStore } from '@/stores/nodeTypes';

export function useUniqueNodeName() {
	/**
	 * All in-store node name defaults ending with a number, e.g.
	 * `AWS S3`, `Magento 2`, `MSG91`, `S3`, `SIGNL4`, `sms77`
	 */
	function numberSuffixedNames() {
		return useNodeTypesStore().allNodeTypes.reduce<string[]>((acc, nodeType) => {
			if (typeof nodeType.defaults.name !== 'string') {
				throw new Error('Expected node name default to be a string');
			}

			if (/\d$/.test(nodeType.defaults.name)) acc.push(nodeType.defaults.name);

			return acc;
		}, []);
	}

	/**
	 * Create a unique node name from an original name, based on the names of
	 * all nodes on canvas and any extra names that cannot be used.
	 */
	function uniqueNodeName(originalName: string, extraNames: string[] = []) {
		const { canvasNames } = useWorkflowsStore();

		const isUnique = !canvasNames.has(originalName) && !extraNames.includes(originalName);

		if (isUnique) return originalName;

		const nsn = numberSuffixedNames().find((nsn) => originalName.startsWith(nsn));

		// edge case, number suffix as part of name: S3 -> S31 -> S32

		if (nsn) {
			let unique = '';
			let index = 1;

			const remainder = originalName.split(nsn).pop();

			const lastChar = remainder?.[remainder.length - 1];

			if (lastChar && Number.isInteger(Number(lastChar))) {
				index = parseInt(lastChar, 10);
				originalName = originalName.slice(0, -1);
			}

			unique = originalName;

			while (canvasNames.has(unique) || extraNames.includes(unique)) {
				unique = originalName + index++;
			}

			return unique;
		}

		// edge case, all-number name: 123 -> 123-1 -> 123-2

		if (/^\d+-?\d*$/.test(originalName)) {
			let unique = '';
			let index = 1;

			const match = originalName.match(/(?<base>\d+)-?(?<suffix>\d*)/);

			if (!match?.groups) {
				throw new Error('Failed to find match for unique name');
			}

			if (match?.groups?.suffix !== '') {
				index = parseInt(match.groups.suffix, 10);
			}

			unique = match.groups.base;

			while (canvasNames.has(unique) || extraNames.includes(unique)) {
				unique = match.groups.base + '-' + index++;
			}

			return unique;
		}

		// normal case: A -> A1 -> A2

		let unique = '';
		let index = 1;

		const match = originalName.match(/(?<base>.*\D+)(?<suffix>\d*)/);

		if (!match?.groups) {
			throw new Error('Failed to find match for unique name');
		}

		if (match?.groups?.suffix !== '') {
			index = parseInt(match.groups.suffix, 10);
		}

		unique = match.groups.base;

		while (canvasNames.has(unique) || extraNames.includes(unique)) {
			unique = match.groups.base + index++;
		}

		return unique;
	}

	return { uniqueNodeName };
}
