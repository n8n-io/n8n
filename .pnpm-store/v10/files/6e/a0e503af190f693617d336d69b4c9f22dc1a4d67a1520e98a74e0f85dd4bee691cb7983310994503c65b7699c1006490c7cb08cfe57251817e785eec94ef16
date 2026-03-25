'use strict';

!function(){try{var e="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:{},n=(new e.Error).stack;n&&(e._sentryDebugIds=e._sentryDebugIds||{},e._sentryDebugIds[n]="abdb8baf-b3c5-5301-8ac4-55ed1f07e970")}catch(e){}}();

var chunkHZVCNUTP_js = require('./chunk-HZVCNUTP.js');
var chunkF6FLWRPJ_js = require('./chunk-F6FLWRPJ.js');
var chunkLZXDNZPW_js = require('./chunk-LZXDNZPW.js');
var chunkTKGT252T_js = require('./chunk-TKGT252T.js');

var c=chunkTKGT252T_js.e(chunkF6FLWRPJ_js.z());var{STORYBOOK_BASE_DIR:u,STORYBOOK_CONFIG_DIR:h,WEBPACK_STATS_FILE:k}=process.env;async function B(d){let{flags:t,input:p}=(0, c.default)(`
    Usage
      $ chromatic trace [-b|--base-dir] [-c|--config-dir] [-s|--stats-file] [-u|--untraced] [-m|--mode] [<changed files>...]

    Options
      <changed files>...                    List of changed files relative to repository root.
      --stats-file, -s <filepath>           Path to preview-stats.json. Alternatively, set WEBPACK_STATS_FILE. (default: 'storybook-static/preview-stats.json')
      --storybook-base-dir, -b <dirname>    Relative path from repository root to Storybook project root. Alternatively, set STORYBOOK_BASE_DIR. Use when your Storybook is located in a subdirectory of your repository.
      --storybook-config-dir, -c <dirname>  Directory where to load Storybook configurations from. Alternatively, set STORYBOOK_CONFIG_DIR. (default: '.storybook')
      --untraced, -u <filepath>             Disregard these files and their dependencies. Globs are supported via picomatch. This flag can be specified multiple times.
      --mode, -m <mode>                     Set to 'expanded' to reveal the underlying list of files for each bundle, or set to 'compact' to only show a flat list of affected story files.
    `,{argv:d,description:"Trace utility for TurboSnap",flags:{statsFile:{type:"string",alias:"s",default:k||"storybook-static/preview-stats.json"},storybookBaseDir:{type:"string",alias:"b",default:u||"."},storybookConfigDir:{type:"string",alias:"c",default:h||".storybook"},untraced:{type:"string",alias:"u",isMultiple:!0},mode:{type:"string",alias:"m"}}}),e=chunkHZVCNUTP_js.E({},{logPrefix:"",logLevel:"info"}),y={log:e,options:{storybookBaseDir:t.storybookBaseDir,storybookConfigDir:t.storybookConfigDir,untraced:t.untraced,traceChanged:t.mode||!0},git:{rootPath:await chunkHZVCNUTP_js.x({log:e})},storybook:{baseDir:t.storybookBaseDir,configDir:t.storybookConfigDir}},g=await chunkLZXDNZPW_js.a(t.statsFile),i=p.map(o=>o.replace(/^\.\//,"")),r=i.find(o=>chunkHZVCNUTP_js.$(o));if(r)throw new Error(`Unable to trace package manifest file (${r}) as that would require diffing file contents.`);await chunkHZVCNUTP_js.ha(y,g,t.statsFile,i);}

exports.main = B;
//# sourceMappingURL=out.js.map
//# sourceMappingURL=trace-WZCOPXHB.js.map
//# debugId=abdb8baf-b3c5-5301-8ac4-55ed1f07e970
