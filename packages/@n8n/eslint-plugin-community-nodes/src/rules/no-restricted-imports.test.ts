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
	],
});
