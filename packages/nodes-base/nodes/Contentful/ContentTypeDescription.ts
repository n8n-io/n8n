import { INodeProperties, INodePropertyOptions } from "n8n-workflow";

export const resource = {
  name: "Content Types",
  value: "content_type",
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
        name: "Get Content types",
        value: "get_content_types",
      },
      {
        name: "Get Single Content Type",
        value: "get_content_type",
      },
    ],
    default: "get_content_types",
    description: "The operation to perform.",
  },
] as INodeProperties[];

export const fields = [
  {
    displayName: "Content Type Id",
    name: "content_type_id",
    type: "string",
    default: "",
    placeholder: "",
    description: "",
    required: true,
    displayOptions: {
      show: {
        resource: [resource.value],
        operation: ["get_content_type"],
      },
    },
  },
] as INodeProperties[];
