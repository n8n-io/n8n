import { RuleTester } from '@typescript-eslint/rule-tester';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll } from 'vitest';

import { NoRestrictedImportsRule } from './no-restricted-imports.js';

// Fixture package whose devDependencies include `vitest` and `@vitest/expect`,
// and whose runtime `dependencies` include `axios`. Used to verify the rule
// allows dev-dependency imports but still restricts runtime dependencies.
// Created synchronously because RuleTester.run reads the `filename` option at
// module-eval time, before any test hooks fire.
const fixtureDir = mkdtempSync(join(tmpdir(), 'n8n-restricted-imports-'));
writeFileSync(
	join(fixtureDir, 'package.json'),
	JSON.stringify({
		name: 'n8n-nodes-devdep-fixture',
		version: '1.0.0',
		devDependencies: { vitest: '^1.0.0', '@vitest/expect': '^1.0.0' },
		dependencies: { axios: '^1.0.0' },
	}),
);
const fixtureTestFile = join(fixtureDir, '__tests__', 'MyNode.test.ts');
const fixtureRealFile = join(fixtureDir, 'src', 'MyNode.node.ts');

afterAll(() => {
	rmSync(fixtureDir, { recursive: true, force: true });
});

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
		{
			name: 'devDependency (vitest) import is allowed in test files',
			filename: fixtureTestFile,
			code: 'import { describe } from "vitest";',
		},
		{
			name: 'scoped devDependency import is allowed in test files',
			filename: fixtureTestFile,
			code: 'import { expect } from "@vitest/expect";',
		},
		{
			name: 'devDependency require is allowed in test files',
			filename: fixtureTestFile,
			code: 'const { it } = require("vitest");',
		},
		{
			name: 'devDependency dynamic import is allowed in test files',
			filename: fixtureTestFile,
			code: 'const vitest = await import("vitest");',
		},
		{
			name: 'type-only devDependency import is allowed in node source',
			filename: fixtureRealFile,
			code: 'import type { Task } from "vitest";',
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
import { WorkflowExecuteMode } from "n8n-workflow";
import { supplyModel } from "@n8n/ai-node-sdk";`,
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
			name: 'runtime dependency (axios) is still restricted in a real node file',
			filename: fixtureRealFile,
			code: 'import axios from "axios";',
			errors: [{ messageId: 'restrictedImport', data: { modulePath: 'axios' } }],
		},
		{
			name: 'runtime dependency (axios) stays restricted even in test files',
			filename: fixtureTestFile,
			code: 'import axios from "axios";',
			errors: [{ messageId: 'restrictedImport', data: { modulePath: 'axios' } }],
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
