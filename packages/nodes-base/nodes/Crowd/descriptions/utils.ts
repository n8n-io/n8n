import { INodeProperties } from "n8n-workflow";

export const showFor = (resources: string[]) => (operations?: string[]): Partial<INodeProperties> => {
	return operations !== undefined ? {
		displayOptions: {
			show: {
				resource: resources,
				operation: operations
			}
		}
	} : {
		displayOptions: {
			show: {
				resource: resources,
			}
		}
	}
}

export const mapWith = <T>(...objects: Partial<T>[]) => (item: Partial<T>) => Object.assign({}, item, ...objects)
