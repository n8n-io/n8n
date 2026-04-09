/* eslint-disable @typescript-eslint/no-unsafe-argument */
import type { CurlToJsonResult } from "./convertCurl.types";
import parser from "yargs-parser";

function isUrl(item: string) {
	try {
		new URL(item);
		return true;
	} catch {
		return false;
	}
}

function checkLocalhostShorthand(item: string) {
	if (item.startsWith("localhost")) {
		return `http://${item}`;
	}
	return item;
}

function clean(item: unknown) {
	return new String(item).replace(/^(['"])([\s\S]*)\1$/, '$2');
}

function parseAuth(raw: string): { user: string; password: string } {
	const cleaned = clean(raw);
	const colonIndex = cleaned.indexOf(":");
	if (colonIndex === -1) {
		return { user: cleaned, password: "" };
	}
	return {
		user: cleaned.slice(0, colonIndex),
		password: cleaned.slice(colonIndex + 1),
	};
}

function parseQueryParams(urlString: string): Record<string, string | string[]> {
	const queries: Record<string, string | string[]> = {};
	const { searchParams } = new URL(urlString);

	for (const [key, val] of searchParams.entries()) {
		const existing = queries[key];
		if (existing === undefined) {
			queries[key] = val;
		} else if (Array.isArray(existing)) {
			existing.push(val);
		} else {
			queries[key] = [existing, val];
		}
	}

	return queries;
}

function applyUrl(raw: string, jsonOutput: CurlToJsonResult): void {
	let candidate = clean(raw);
	candidate = checkLocalhostShorthand(candidate);

	if (!isUrl(candidate)) return;

	const parsed = new URL(candidate);
	jsonOutput.raw_url = candidate;
	const path = parsed.pathname === "/" ? "" : parsed.pathname;
	jsonOutput.url = parsed.origin + path;

	const queries = parseQueryParams(candidate);
	if (Object.keys(queries).length > 0) {
		jsonOutput.queries = queries;
	}
}

function parseHeaders(raw: string | string[]): Record<string, string | null> {
	const headers: Record<string, string | null> = {};
	const items = typeof raw === "string" ? [raw] : raw;

	for (const item of items) {
		const cleaned = clean(item);
		const colonIndex = cleaned.indexOf(":");
		if (colonIndex === -1) continue;
		const key = cleaned.slice(0, colonIndex).trim();
		const val = cleaned.slice(colonIndex + 1).trim();
		headers[key] = val || null;
	}

	return headers;
}

export function convertCurlToJson(curlString: string): CurlToJsonResult {
	const args = parser(curlString, {
		boolean: ["L", "location", "basic", "digest", "ntlm", "negotiate", "ntlm-wb", "k", "insecure", "i", "include"],
	});

	const jsonOutput: CurlToJsonResult = {
		url: "",
		raw_url: "",
		method: "GET",
	};

	let methodDefined = false;

	for (const arg in args) {
		switch (arg) {
			case "_":
				for (const item of args[arg]) {
					if (typeof item === "string") {
						applyUrl(item, jsonOutput);
					}
				}
				break;
			case "url":
				applyUrl(args[arg], jsonOutput);
				break;
			case "X":
			case "request":
				methodDefined = true;
				jsonOutput.method = clean(args[arg]);
				break;
			case "d":
			case "data":
			case "data-raw":
			case "dataRaw":
			case "data-binary":
			case "dataBinary":
			case "data-urlencode":
			case "dataUrlencode": {
				if (!methodDefined) {
					jsonOutput.method = "POST";
				}

				jsonOutput.data ??= {};

				let data = args[arg];
				if (typeof data === "string") {
					data = [data];
				}

				for (const item of data) {
					const cleaned = clean(item);

					if (cleaned.trimStart().startsWith("{")) {
						try {
							const json = JSON.parse(cleaned) as Record<string, unknown>;
							for (const [key, val] of Object.entries(json)) {
								jsonOutput.data[key] = typeof val === "boolean" ? val : String(val);
							}
							continue;
						} catch {
							// fall through to URL-encoded parsing
						}
					}

					const pairs = cleaned.split("&");
					for (const pair of pairs) {
						const eqIndex = pair.indexOf("=");
						if (eqIndex === -1) continue;
						const key = pair.slice(0, eqIndex);
						const val = pair.slice(eqIndex + 1);
						jsonOutput.data[key] = val;
					}
				}
				break;
			}
			case "F":
			case "form": {
				if (!methodDefined) {
					jsonOutput.method = "POST";
				}

				jsonOutput.data ??= {};

				let data = args[arg];
				if (typeof data === "string") {
					data = [data];
				}

				for (const item of data) {
					const [key, val] = clean(item).split("=");
					jsonOutput.data[key] = clean(val);
				}
				break;
			}
			case "H":
			case "header":
				jsonOutput.headers = { ...jsonOutput.headers, ...parseHeaders(args[arg]) };
				break;
			case "u":
			case "user":
				jsonOutput.auth = parseAuth(args[arg]);
				break;
			case "basic":
				jsonOutput.auth_type = "basic";
				break;
			case "digest":
				jsonOutput.auth_type = "digest";
				break;
			case "ntlm":
				jsonOutput.auth_type = "ntlm";
				break;
			case "negotiate":
				jsonOutput.auth_type = "negotiate";
				break;
			case "ntlm-wb":
			case "ntlmWb":
				jsonOutput.auth_type = "ntlm-wb";
				break;
			case "awsSigv4":
			case "aws-sigv4":
				jsonOutput.auth_type = "aws-sigv4";
				jsonOutput.aws_sigv4 = clean(args[arg]);
				break;
			case "oauth2-bearer":
			case "oauth2Bearer":
				jsonOutput.auth_type = "bearer";
				break;
			case "L":
			case "location":
				jsonOutput.follow_redirects = true;
				break;
			case "max-redirs":
			case "maxRedirs":
				jsonOutput.max_redirects = Number(args[arg]);
				break;
			case "connect-timeout":
			case "connectTimeout":
				jsonOutput.connect_timeout = Number(args[arg]);
				break;
			case "k":
			case "insecure":
				jsonOutput.insecure = true;
				break;
			case "i":
			case "include":
				jsonOutput.include = true;
				break;
			case "x":
			case "proxy":
				jsonOutput.proxy = clean(args[arg]);
				break;
			case "o":
			case "output":
				jsonOutput.output = clean(args[arg]);
				break;
		}
	}

	if (jsonOutput.auth && !jsonOutput.auth_type) {
		jsonOutput.auth_type = "basic";
	}

	if (!jsonOutput.url) {
		throw new Error("no URL specified!")
	}

	return jsonOutput;
}
