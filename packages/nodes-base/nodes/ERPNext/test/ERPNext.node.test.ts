import type { IExecuteFunctions, ILoadOptionsFunctions } from "n8n-workflow";
import { mockDeep } from "vitest-mock-extended";

import { ERPNext } from "../ERPNext.node";

describe("ERPNext", () => {
	const node = new ERPNext();
	const credentials = {
		environment: "selfHosted",
		domain: "https://erpnext.example.com",
	};

	it.each(["Service Product", "Sales Invoice Item", "Customer"])(
		"keeps the DocType value unchanged for %s",
		async (name) => {
			const context = mockDeep<ILoadOptionsFunctions>();
			context.getCredentials.mockResolvedValue(credentials);
			context.helpers.requestWithAuthentication
				.mockResolvedValueOnce({ data: [{ name }] })
				.mockResolvedValueOnce({ data: [] });

			const options = await node.methods.loadOptions.getDocTypes.call(context);

			expect(options).toEqual([{ name, value: name }]);
		},
	);

	it.each([false, true])(
		"passes the selected DocType to the API and filters without encoding (returnAll=%s)",
		async (returnAll) => {
			const loadContext = mockDeep<ILoadOptionsFunctions>();
			loadContext.getCredentials.mockResolvedValue(credentials);
			loadContext.helpers.requestWithAuthentication
				.mockResolvedValueOnce({ data: [{ name: "Service Product" }] })
				.mockResolvedValueOnce({ data: [] });
			const [docType] =
				await node.methods.loadOptions.getDocTypes.call(loadContext);

			const context = mockDeep<IExecuteFunctions>();
			context.getCredentials.mockResolvedValue(credentials);
			context.getInputData.mockReturnValue([{ json: {} }]);
			context.getNodeParameter.mockImplementation((name) => {
				switch (name) {
					case "resource":
						return "document";
					case "operation":
						return "getAll";
					case "docType":
						return docType.value;
					case "returnAll":
						return returnAll;
					case "limit":
						return 10;
					case "options":
						return {
							filters: {
								customProperty: [
									{ field: "enabled", operator: "is", value: "1" },
								],
							},
						};
					default:
						throw new Error(`Unexpected parameter: ${name}`);
				}
			});
			context.helpers.requestWithAuthentication.mockResolvedValue({ data: [] });
			context.helpers.returnJsonArray.mockReturnValue([]);
			context.helpers.constructExecutionMetaData.mockReturnValue([]);

			await node.execute.call(context);

			expect(context.helpers.requestWithAuthentication).toHaveBeenCalledWith(
				"erpNextApi",
				expect.objectContaining({
					method: "GET",
					uri: "https://erpnext.example.com/api/resource/Service Product",
					qs: expect.objectContaining({
						filters: JSON.stringify([["Service Product", "enabled", "=", "1"]]),
					}),
				}),
			);
		},
	);
});
