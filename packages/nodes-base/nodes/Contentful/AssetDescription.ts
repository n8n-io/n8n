import { INodeProperties, INodePropertyOptions } from "n8n-workflow";

export const resource = {
  name: "Asset",
  value: "asset",
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
        name: "Get Assets",
        value: "get_assets",
      },
      {
        name: "Get Single Asset",
        value: "get_asset",
      },
    ],
    default: "get_assets",
    description: "The operation to perform.",
  },
] as INodeProperties[];

export const fields = [
  {
    displayName: "Asset Id",
    name: "asset_id",
    type: "string",
    default: "",
    placeholder: "",
    description: "",
    required: true,
    displayOptions: {
      show: {
        resource: [resource.value],
        operation: ["get_asset"],
      },
    },
  },
] as INodeProperties[];
