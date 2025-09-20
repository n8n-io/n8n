import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoRestrictedImportsRule } from './no-restricted-imports.js';

const ruleTester = new RuleTester();

ruleTester.run('no-restricted-imports', NoRestrictedImportsRule, {
	valid: [
		{
			code: 'import { WorkflowExecuteMode } from "n8n-workflow";',
		},
		{
			code: 'import _ from "lodash";',
		},
		{
			code: 'import moment from "moment";',
		},
		{
			code: 'import pLimit from "p-limit";',
		},
		{
			code: 'import { DateTime } from "luxon";',
		},
		{
			code: 'import { z } from "zod";',
		},
		{
			code: 'import crypto from "crypto";',
		},
		{
			code: 'import crypto from "node:crypto";',
		},
		{
			code: 'import { helper } from "./helper";',
		},
		{
			code: 'import { utils } from "../utils";',
		},
		{
			code: 'const helper = require("./helper");',
		},
		{
			code: 'const utils = require("../utils");',
		},
		{
			code: 'const _ = require("lodash");',
		},
		{
			code: 'require.resolve("lodash");',
		},
		{
			code: 'require.resolve("./helper");',
		},
		{
			code: 'require.resolve("../utils");',
		},
		{
			code: 'const workflow = await import("n8n-workflow");',
		},
		{
			code: 'import("lodash").then((_) => {});',
		},
		{
			code: 'const helper = await import("./helper");',
		},
		{
			code: 'import("../utils").then((utils) => {});',
		},
		{
			code: 'import(`lodash`).then((_) => {});',
		},
		{
			code: 'require(`./helper`);',
		},
		{
			code: 'require.resolve(`n8n-workflow`);',
		},
		{
			code: 'const workflow = await import(`n8n-workflow`);',
		},
	],
	invalid: [
		{
			code: 'import fs from "fs";',
			errors: [{ messageId: 'restrictedImport', data: { modulePath: 'fs' } }],
		},
		{
			code: 'import path from "path";',
			errors: [{ messageId: 'restrictedImport', data: { modulePath: 'path' } }],
		},
		{
			code: 'import express from "express";',
			errors: [{ messageId: 'restrictedImport', data: { modulePath: 'express' } }],
		},
		{
			code: 'import axios from "axios";',
			errors: [{ messageId: 'restrictedImport', data: { modulePath: 'axios' } }],
		},
		{
			code: 'import { Client } from "@elastic/elasticsearch";',
			errors: [{ messageId: 'restrictedImport', data: { modulePath: '@elastic/elasticsearch' } }],
		},
		{
			code: 'const fs = require("fs");',
			errors: [{ messageId: 'restrictedRequire', data: { modulePath: 'fs' } }],
		},
		{
			code: 'const path = require("path");',
			errors: [{ messageId: 'restrictedRequire', data: { modulePath: 'path' } }],
		},
		{
			code: 'const express = require("express");',
			errors: [{ messageId: 'restrictedRequire', data: { modulePath: 'express' } }],
		},
		{
			code: 'require.resolve("fs");',
			errors: [{ messageId: 'restrictedRequire', data: { modulePath: 'fs' } }],
		},
		{
			code: 'require.resolve("express");',
			errors: [{ messageId: 'restrictedRequire', data: { modulePath: 'express' } }],
		},
		{
			code: 'const resolved = require.resolve("axios");',
			errors: [{ messageId: 'restrictedRequire', data: { modulePath: 'axios' } }],
		},
		{
			code: `
import fs from "fs";
import path from "path";
import { WorkflowExecuteMode } from "n8n-workflow";`,
			errors: [
				{ messageId: 'restrictedImport', data: { modulePath: 'fs' } },
				{ messageId: 'restrictedImport', data: { modulePath: 'path' } },
			],
		},
		{
			code: `
const fs = require("fs");
const express = require("express");
const lodash = require("lodash");`,
			errors: [
				{ messageId: 'restrictedRequire', data: { modulePath: 'fs' } },
				{ messageId: 'restrictedRequire', data: { modulePath: 'express' } },
			],
		},
		{
			code: 'const fs = await import("fs");',
			errors: [{ messageId: 'restrictedDynamicImport', data: { modulePath: 'fs' } }],
		},
		{
			code: 'import("path").then((path) => {});',
			errors: [{ messageId: 'restrictedDynamicImport', data: { modulePath: 'path' } }],
		},
		{
			code: 'const express = await import("express");',
			errors: [{ messageId: 'restrictedDynamicImport', data: { modulePath: 'express' } }],
		},
		{
			code: 'const path = require(`path`);',
			errors: [{ messageId: 'restrictedRequire', data: { modulePath: 'path' } }],
		},
		{
			code: 'require.resolve(`express`);',
			errors: [{ messageId: 'restrictedRequire', data: { modulePath: 'express' } }],
		},
		{
			code: 'const axios = await import(`axios`);',
			errors: [{ messageId: 'restrictedDynamicImport', data: { modulePath: 'axios' } }],
		},
		{
			code: `
const fs = await import("fs");
import("axios").then((axios) => {});
const workflow = await import("n8n-workflow");`,
			errors: [
				{ messageId: 'restrictedDynamicImport', data: { modulePath: 'fs' } },
				{ messageId: 'restrictedDynamicImport', data: { modulePath: 'axios' } },
			],
		},
	],
});
