import { INodeProperties, INodePropertyOptions } from "n8n-workflow";

export const resource = {
  name: "Locale",
  value: "locale",
} as INodePropertyOptions;

export const operations = [
  {
    displayName: "Operation",
    name: "operation",
    type: "options",
    displayOptions: {
      show: {
        resource: [resource.value],
      },
    },
    options: [
      {
        name: "Get Locales",
        value: "get_locales",
      },
    ],
    default: "get_locales",
    description: "The operation to perform.",
  },
] as INodeProperties[];

export const fields = [] as INodeProperties[];
