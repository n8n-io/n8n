{
	"name": "xlsx",
	"version": "0.19.3",
	"author": "sheetjs",
	"description": "SheetJS Spreadsheet data parser and writer",
	"keywords": [
		"excel",
		"xls",
		"xlsx",
		"xlsb",
		"xlsm",
		"ods",
		"csv",
		"dbf",
		"dif",
		"sylk",
		"office",
		"spreadsheet"
	],
	"bin": {
		"xlsx": "./bin/xlsx.njs"
	},
	"main": "xlsx.js",
	"module": "xlsx.mjs",
	"unpkg": "dist/xlsx.full.min.js",
	"jsdelivr": "dist/xlsx.full.min.js",
	"types": "types/index.d.ts",
	"exports": {
		".": {
			"import": "./xlsx.mjs",
			"require": "./xlsx.js",
			"types": "./types/index.d.ts"
		},
		"./xlsx.mjs": {
			"import": "./xlsx.mjs",
			"types": "./types/index.d.ts"
		},
		"./xlsx.js": {
			"require": "./xlsx.js",
			"types": "./types/index.d.ts"
		},
		"./dist/xlsx.zahl": {
			"import": "./dist/xlsx.zahl.mjs",
			"require": "./dist/xlsx.zahl.js",
			"types": "./dist/zahl.d.ts"
		},
		"./dist/xlsx.zahl.mjs": {
			"import": "./dist/xlsx.zahl.mjs",
			"types": "./dist/zahl.d.ts"
		},
		"./dist/xlsx.zahl.js": {
			"require": "./dist/xlsx.zahl.js",
			"types": "./dist/zahl.d.ts"
		},
		"./dist/cpexcel": {
			"import": "./dist/cpexcel.full.mjs",
			"require": "./dist/cpexcel.js",
			"types": "./dist/cpexcel.d.ts"
		},
		"./dist/cpexcel.js": {
			"require": "./dist/cpexcel.js",
			"types": "./dist/cpexcel.d.ts"
		},
		"./dist/cpexcel.full": {
			"import": "./dist/cpexcel.full.mjs",
			"require": "./dist/cpexcel.js",
			"types": "./dist/cpexcel.d.ts"
		},
		"./dist/cpexcel.full.mjs": {
			"import": "./dist/cpexcel.full.mjs",
			"types": "./dist/cpexcel.d.ts"
		}
	},
	"browser": {
		"buffer": false,
		"crypto": false,
		"stream": false,
		"process": false,
		"fs": false
	},
	"sideEffects": false,
	"dependencies": {
	},
	"devDependencies": {
		"@sheetjs/uglify-js": "~2.7.3",
		"@types/node": "^8.5.9",
		"acorn": "7.4.1",
		"adler-32": "~1.3.1",
		"alex": "8.1.1",
		"blanket": "~1.2.3",
		"cfb": "~1.2.2",
		"codepage": "~1.15.0",
		"commander": "~2.17.1",
		"crc-32": "~1.2.2",
		"dtslint": "^0.1.2",
		"eslint": "7.23.0",
		"eslint-plugin-html": "^6.1.2",
		"eslint-plugin-json": "^2.1.2",
		"exit-on-epipe": "~1.0.1",
		"fflate": "^0.7.1",
		"jsdom": "~11.1.0",
		"markdown-spellcheck": "^1.3.1",
		"mocha": "~2.5.3",
		"sinon": "^1.17.7",
		"ssf": "~0.11.2",
		"typescript": "2.2.0",
		"wmf": "~1.0.1",
		"word": "~0.3.0"
	},
	"repository": {
		"type": "git",
		"url": "https://git.sheetjs.com/SheetJS/sheetjs"
	},
	"scripts": {
		"pretest": "npm run lint",
		"test": "npm run tests-only",
		"pretest-only": "git submodule init && git submodule update",
		"tests-only": "make travis",
		"build": "make",
		"lint": "make fullint",
		"dtslint": "dtslint types"
	},
	"config": {
		"blanket": {
			"pattern": "xlsx.js"
		}
	},
	"alex": {
		"allow": [
			"chinese",
			"special",
			"simple",
			"just",
			"crash",
			"wtf",
			"holes"
		]
	},
	"homepage": "https://sheetjs.com/",
	"bugs": {
		"url": "https://git.sheetjs.com/SheetJS/sheetjs/issues"
	},
	"license": "Apache-2.0",
	"engines": {
		"node": ">=0.8"
	}
}
