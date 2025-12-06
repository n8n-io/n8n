2025-12-04T15:00:27.000000000Z [inf]  Starting Container
2025-12-04T15:00:28.655025455Z [inf]  > cd packages/cli/bin && ./n8n
2025-12-04T15:00:28.655037889Z [inf]
2025-12-04T15:00:28.655063230Z [inf]
2025-12-04T15:00:28.655075330Z [err]  npm warn config production Use `--omit=dev` instead.
2025-12-04T15:00:28.655082846Z [inf]
2025-12-04T15:00:28.655087552Z [inf]
2025-12-04T15:00:28.655099640Z [inf]  > n8n-monorepo@1.117.0 start /app
2025-12-04T15:00:28.655099822Z [inf]  > n8n-monorepo@1.117.0 start:default
2025-12-04T15:00:28.655112644Z [inf]  > run-script-os
2025-12-04T15:00:30.081042478Z [inf]  Permissions 0644 for n8n settings file /root/.n8n/config are too wide. This is ignored for now, but in the future n8n will attempt to change the permissions automatically. To automatically enforce correct permissions now set N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true (recommended), or turn this check off set N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=false.
2025-12-04T15:00:30.123823518Z [inf]  Initializing n8n process
2025-12-04T15:00:30.797939452Z [inf]  n8n ready on ::, port 5678
2025-12-04T15:00:31.152925603Z [inf]  n8n detected that some packages are missing. For more information, visit https://docs.n8n.io/integrations/community-nodes/troubleshooting/
2025-12-04T15:00:31.180575615Z [inf]
2025-12-04T15:00:31.180582853Z [inf]  There are deprecations related to your environment variables. Please take the recommended actions to update your configuration:
2025-12-04T15:00:31.180589581Z [inf]   - N8N_RUNNERS_ENABLED -> Running n8n without task runners is deprecated. Task runners will be turned on by default in a future version. Please set `N8N_RUNNERS_ENABLED=true` to enable task runners now and avoid potential issues in the future. Learn more: https://docs.n8n.io/hosting/configuration/task-runners/
2025-12-04T15:00:31.180595933Z [inf]   - N8N_BLOCK_ENV_ACCESS_IN_NODE -> The default value of N8N_BLOCK_ENV_ACCESS_IN_NODE will be changed from false to true in a future version. If you need to access environment variables from the Code Node or from expressions, please set N8N_BLOCK_ENV_ACCESS_IN_NODE=false. Learn more: https://docs.n8n.io/hosting/configuration/environment-variables/security/
2025-12-04T15:00:31.180602079Z [inf]   - N8N_GIT_NODE_DISABLE_BARE_REPOS -> Support for bare repositories in the Git Node will be removed in a future version due to security concerns. If you are not using bare repositories in the Git Node, please set N8N_GIT_NODE_DISABLE_BARE_REPOS=true. Learn more: https://docs.n8n.io/hosting/configuration/environment-variables/security/
2025-12-04T15:00:31.180608609Z [inf]
2025-12-04T15:00:31.264132638Z [inf]  [license SDK] attempting license renewal
2025-12-04T15:00:32.694456222Z [inf]  Failed to decrypt external secrets settings. Skipping external secrets initialization.
2025-12-04T15:00:33.704064764Z [inf]  Version: 1.117.0
2025-12-04T15:00:33.831400143Z [inf]  Start Active Workflows:
2025-12-04T15:00:34.204368363Z [inf]  Activated workflow "Email Acct Warmup" (ID: xJHcBX58uggx0XVK)
2025-12-04T15:00:34.469902882Z [inf]  Activated workflow "Email Acct Warmup .Tech" (ID: 8Tf5kerd9DAPkcBW)
2025-12-04T15:00:34.750109283Z [inf]  Activated workflow "Phase 0 - Search Target Generator" (ID: hgLBgdFEOr1Zkv49)
2025-12-04T15:00:34.750117662Z [inf]
2025-12-04T15:00:34.750126941Z [inf]  Editor is now accessible via:
2025-12-04T15:00:34.750136078Z [inf]  https://www.n8n.solomon.technology
2025-12-04T15:00:42.837131609Z [inf]  Credential with ID "4jXWwNfMGbPity8V" does not exist for type "smtp".
2025-12-04T15:04:03.479533834Z [inf]  Invalid collaboration message format
2025-12-04T15:04:03.479541166Z [inf]  Error: Invalid collaboration message format
2025-12-04T15:04:03.479547765Z [inf]      at Push.<anonymous> (/app/packages/cli/src/collaboration/collaboration.service.ts:39:7)
2025-12-04T15:04:03.479555017Z [inf]      at processTicksAndRejections (node:internal/process/task_queues:105:5)
2025-12-04T15:04:03.479563311Z [inf]
2025-12-04T15:04:03.479570967Z [inf]  [
2025-12-04T15:04:03.479579693Z [inf]    {
2025-12-04T15:04:03.479587821Z [inf]      "validation": "uuid",
2025-12-04T15:04:03.479594934Z [inf]      "code": "invalid_string",
2025-12-04T15:04:03.479601256Z [inf]      "message": "Invalid workflow ID format",
2025-12-04T15:04:03.479608075Z [inf]      "path": [
2025-12-04T15:04:03.479614772Z [inf]        "workflowId"
2025-12-04T15:04:03.479621710Z [inf]      ]
2025-12-04T15:04:03.479627920Z [inf]    }
2025-12-04T15:04:03.479635497Z [inf]  ]
2025-12-04T15:04:03.479647795Z [err]  (node:51) [DEP0060] DeprecationWarning: The `util._extend` API is deprecated. Please use Object.assign() instead.
2025-12-04T15:04:03.479655621Z [err]  (Use `node --trace-deprecation ...` to show where the warning was created)
2025-12-04T15:04:07.730513524Z [inf]  Credentials could not be decrypted. The likely reason is that a different "encryptionKey" was used to encrypt the data.
2025-12-04T15:04:07.730525066Z [inf]  Error: Credentials could not be decrypted. The likely reason is that a different "encryptionKey" was used to encrypt the data.
2025-12-04T15:04:07.730532780Z [inf]      at Credentials.getData (/app/packages/core/src/credentials.ts:57:10)
2025-12-04T15:04:07.730540137Z [inf]      at CredentialsService.decrypt (/app/packages/cli/src/credentials/credentials.service.ts:368:32)
2025-12-04T15:04:07.730546965Z [inf]      at /app/packages/cli/src/credentials/credentials.service.ts:155:65
2025-12-04T15:04:07.730554240Z [inf]      at Array.map (<anonymous>)
2025-12-04T15:04:07.730561209Z [inf]      at CredentialsService.getMany (/app/packages/cli/src/credentials/credentials.service.ts:154:31)
2025-12-04T15:04:07.730568132Z [inf]      at processTicksAndRejections (node:internal/process/task_queues:105:5)
2025-12-04T15:04:07.730575153Z [inf]      at CredentialsController.getMany (/app/packages/cli/src/credentials/credentials.controller.ts:72:23)
2025-12-04T15:04:07.730582646Z [inf]      at handler (/app/packages/cli/src/controller.registry.ts:79:12)
2025-12-04T15:04:07.730589002Z [inf]      at /app/packages/cli/src/response-helper.ts:157:17
2025-12-04T15:04:07.730596074Z [inf]
2025-12-04T15:04:07.730605294Z [inf]  error:1C800064:Provider routines::bad decrypt
2025-12-04T15:04:07.730613100Z [inf]  Credentials could not be decrypted. The likely reason is that a different "encryptionKey" was used to encrypt the data.
2025-12-04T15:04:07.730619572Z [inf]  Error: Credentials could not be decrypted. The likely reason is that a different "encryptionKey" was used to encrypt the data.
2025-12-04T15:04:07.730626323Z [inf]      at Credentials.getData (/app/packages/core/src/credentials.ts:57:10)
2025-12-04T15:04:07.730632237Z [inf]      at CredentialsService.decrypt (/app/packages/cli/src/credentials/credentials.service.ts:368:32)
2025-12-04T15:04:07.842642928Z [inf]      at /app/packages/cli/src/credentials/credentials.service.ts:155:65
2025-12-04T15:04:07.842650976Z [inf]      at Array.map (<anonymous>)
2025-12-04T15:04:07.842665340Z [inf]      at CredentialsService.getMany (/app/packages/cli/src/credentials/credentials.service.ts:154:31)
2025-12-04T15:04:07.842672651Z [inf]      at processTicksAndRejections (node:internal/process/task_queues:105:5)
2025-12-04T15:04:07.842680332Z [inf]      at CredentialsController.getMany (/app/packages/cli/src/credentials/credentials.controller.ts:72:23)
2025-12-04T15:04:07.842688491Z [inf]      at handler (/app/packages/cli/src/controller.registry.ts:79:12)
2025-12-04T15:04:07.842699965Z [inf]      at /app/packages/cli/src/response-helper.ts:157:17
2025-12-04T15:04:07.842711907Z [inf]
2025-12-04T15:04:07.842719141Z [inf]  error:1C800064:Provider routines::bad decrypt
2025-12-04T15:04:07.842726565Z [inf]  Credentials could not be decrypted. The likely reason is that a different "encryptionKey" was used to encrypt the data.
2025-12-04T15:04:07.842733874Z [inf]  Error: Credentials could not be decrypted. The likely reason is that a different "encryptionKey" was used to encrypt the data.
2025-12-04T15:04:07.842741757Z [inf]      at Credentials.getData (/app/packages/core/src/credentials.ts:57:10)
2025-12-04T15:04:07.842749537Z [inf]      at CredentialsService.decrypt (/app/packages/cli/src/credentials/credentials.service.ts:368:32)
2025-12-04T15:04:07.842761828Z [inf]      at /app/packages/cli/src/credentials/credentials.service.ts:155:65
2025-12-04T15:04:07.842768558Z [inf]      at Array.map (<anonymous>)
2025-12-04T15:04:07.842776288Z [inf]      at CredentialsService.getMany (/app/packages/cli/src/credentials/credentials.service.ts:154:31)
2025-12-04T15:04:07.842784833Z [inf]      at processTicksAndRejections (node:internal/process/task_queues:105:5)
2025-12-04T15:04:07.842791970Z [inf]      at CredentialsController.getMany (/app/packages/cli/src/credentials/credentials.controller.ts:72:23)
2025-12-04T15:04:07.842800821Z [inf]      at handler (/app/packages/cli/src/controller.registry.ts:79:12)
2025-12-04T15:04:07.842808775Z [inf]      at /app/packages/cli/src/response-helper.ts:157:17
2025-12-04T15:04:07.842816784Z [inf]
2025-12-04T15:04:07.842823998Z [inf]  error:1C800064:Provider routines::bad decrypt
2025-12-04T15:04:07.842832402Z [inf]  Credentials could not be decrypted. The likely reason is that a different "encryptionKey" was used to encrypt the data.
2025-12-04T15:04:07.842841191Z [inf]  Error: Credentials could not be decrypted. The likely reason is that a different "encryptionKey" was used to encrypt the data.
2025-12-04T15:04:07.842848101Z [inf]      at Credentials.getData (/app/packages/core/src/credentials.ts:57:10)
2025-12-04T15:04:07.842856122Z [inf]      at CredentialsService.decrypt (/app/packages/cli/src/credentials/credentials.service.ts:368:32)
2025-12-04T15:04:07.842863461Z [inf]      at /app/packages/cli/src/credentials/credentials.service.ts:155:65
2025-12-04T15:04:07.842870739Z [inf]      at Array.map (<anonymous>)
2025-12-04T15:04:07.842878671Z [inf]      at CredentialsService.getMany (/app/packages/cli/src/credentials/credentials.service.ts:154:31)
2025-12-04T15:04:07.842894914Z [inf]      at processTicksAndRejections (node:internal/process/task_queues:105:5)
2025-12-04T15:04:07.842903058Z [inf]      at CredentialsController.getMany (/app/packages/cli/src/credentials/credentials.controller.ts:72:23)
2025-12-04T15:04:07.842910796Z [inf]      at handler (/app/packages/cli/src/controller.registry.ts:79:12)
2025-12-04T15:04:07.842917870Z [inf]      at /app/packages/cli/src/response-helper.ts:157:17
2025-12-04T15:04:07.842924930Z [inf]
2025-12-04T15:04:07.842935197Z [inf]  error:1C800064:Provider routines::bad decrypt
2025-12-04T15:04:27.736661367Z [inf]  Credentials could not be decrypted. The likely reason is that a different "encryptionKey" was used to encrypt the data.
2025-12-04T15:04:27.736661442Z [inf]      at CredentialsController.getMany (/app/packages/cli/src/credentials/credentials.controller.ts:72:23)
2025-12-04T15:04:27.736673157Z [inf]  Error: Credentials could not be decrypted. The likely reason is that a different "encryptionKey" was used to encrypt the data.
2025-12-04T15:04:27.736673554Z [inf]      at handler (/app/packages/cli/src/controller.registry.ts:79:12)
2025-12-04T15:04:27.736683898Z [inf]      at /app/packages/cli/src/response-helper.ts:157:17
2025-12-04T15:04:27.736683960Z [inf]      at Credentials.getData (/app/packages/core/src/credentials.ts:57:10)
2025-12-04T15:04:27.736693583Z [inf]      at CredentialsService.decrypt (/app/packages/cli/src/credentials/credentials.service.ts:368:32)
2025-12-04T15:04:27.736693613Z [inf]
2025-12-04T15:04:27.736704164Z [inf]  error:1C800064:Provider routines::bad decrypt
2025-12-04T15:04:27.736705443Z [inf]      at /app/packages/cli/src/credentials/credentials.service.ts:155:65
2025-12-04T15:04:27.736714759Z [inf]      at Array.map (<anonymous>)
2025-12-04T15:04:27.736714839Z [inf]  Credentials could not be decrypted. The likely reason is that a different "encryptionKey" was used to encrypt the data.
2025-12-04T15:04:27.736724592Z [inf]      at CredentialsService.getMany (/app/packages/cli/src/credentials/credentials.service.ts:154:31)
2025-12-04T15:04:27.736726159Z [inf]  Error: Credentials could not be decrypted. The likely reason is that a different "encryptionKey" was used to encrypt the data.
2025-12-04T15:04:27.736735207Z [inf]      at Credentials.getData (/app/packages/core/src/credentials.ts:57:10)
2025-12-04T15:04:27.736735263Z [inf]      at processTicksAndRejections (node:internal/process/task_queues:105:5)
2025-12-04T15:04:27.736743268Z [inf]      at CredentialsService.decrypt (/app/packages/cli/src/credentials/credentials.service.ts:368:32)
2025-12-04T15:04:27.737932201Z [inf]  Credentials could not be decrypted. The likely reason is that a different "encryptionKey" was used to encrypt the data.
2025-12-04T15:04:27.737943585Z [inf]  Error: Credentials could not be decrypted. The likely reason is that a different "encryptionKey" was used to encrypt the data.
2025-12-04T15:04:27.737951959Z [inf]      at Credentials.getData (/app/packages/core/src/credentials.ts:57:10)
2025-12-04T15:04:27.737960599Z [inf]      at CredentialsService.decrypt (/app/packages/cli/src/credentials/credentials.service.ts:368:32)
2025-12-04T15:04:27.737962644Z [inf]      at /app/packages/cli/src/credentials/credentials.service.ts:155:65
2025-12-04T15:04:27.737969769Z [inf]      at /app/packages/cli/src/credentials/credentials.service.ts:155:65
2025-12-04T15:04:27.737971804Z [inf]      at Array.map (<anonymous>)
2025-12-04T15:04:27.737978519Z [inf]      at Array.map (<anonymous>)
2025-12-04T15:04:27.737984983Z [inf]      at CredentialsService.getMany (/app/packages/cli/src/credentials/credentials.service.ts:154:31)
2025-12-04T15:04:27.737986996Z [inf]      at CredentialsService.getMany (/app/packages/cli/src/credentials/credentials.service.ts:154:31)
2025-12-04T15:04:27.737995135Z [inf]      at processTicksAndRejections (node:internal/process/task_queues:105:5)
2025-12-04T15:04:27.738001563Z [inf]      at processTicksAndRejections (node:internal/process/task_queues:105:5)
2025-12-04T15:04:27.738002880Z [inf]      at CredentialsController.getMany (/app/packages/cli/src/credentials/credentials.controller.ts:72:23)
2025-12-04T15:04:27.738010111Z [inf]      at CredentialsController.getMany (/app/packages/cli/src/credentials/credentials.controller.ts:72:23)
2025-12-04T15:04:27.738017482Z [inf]      at handler (/app/packages/cli/src/controller.registry.ts:79:12)
2025-12-04T15:04:27.738025003Z [inf]      at /app/packages/cli/src/response-helper.ts:157:17
2025-12-04T15:04:27.738032521Z [inf]
2025-12-04T15:04:27.738042023Z [inf]  error:1C800064:Provider routines::bad decrypt
2025-12-04T15:04:27.738886831Z [inf]      at CredentialsService.getMany (/app/packages/cli/src/credentials/credentials.service.ts:154:31)
2025-12-04T15:04:27.738898474Z [inf]      at processTicksAndRejections (node:internal/process/task_queues:105:5)
2025-12-04T15:04:27.738899165Z [inf]
2025-12-04T15:04:27.738907344Z [inf]      at CredentialsController.getMany (/app/packages/cli/src/credentials/credentials.controller.ts:72:23)
2025-12-04T15:04:27.738913141Z [inf]  error:1C800064:Provider routines::bad decrypt
2025-12-04T15:04:27.738917185Z [inf]      at handler (/app/packages/cli/src/controller.registry.ts:79:12)
2025-12-04T15:04:27.738920421Z [inf]      at handler (/app/packages/cli/src/controller.registry.ts:79:12)
2025-12-04T15:04:27.738925478Z [inf]  Credentials could not be decrypted. The likely reason is that a different "encryptionKey" was used to encrypt the data.
2025-12-04T15:04:27.738926651Z [inf]      at /app/packages/cli/src/response-helper.ts:157:17
2025-12-04T15:04:27.738930265Z [inf]      at /app/packages/cli/src/response-helper.ts:157:17
2025-12-04T15:04:27.738936345Z [inf]
2025-12-04T15:04:27.738937798Z [inf]  Error: Credentials could not be decrypted. The likely reason is that a different "encryptionKey" was used to encrypt the data.
2025-12-04T15:04:27.738947211Z [inf]      at Credentials.getData (/app/packages/core/src/credentials.ts:57:10)
2025-12-04T15:04:27.738956273Z [inf]      at CredentialsService.decrypt (/app/packages/cli/src/credentials/credentials.service.ts:368:32)
2025-12-04T15:04:27.738960055Z [inf]  error:1C800064:Provider routines::bad decrypt
2025-12-04T15:04:27.738965590Z [inf]      at /app/packages/cli/src/credentials/credentials.service.ts:155:65
2025-12-04T15:04:27.738975308Z [inf]      at Array.map (<anonymous>)
2025-12-04T15:04:32.733255436Z [inf]  Slow database query
2025-12-04T15:04:39.484082923Z [inf]  Slow database query
2025-12-04T15:04:42.828794398Z [inf]  Slow database query
2025-12-04T15:04:47.942719272Z [inf]  Slow database query
2025-12-04T15:04:47.947845692Z [inf]  Slow database query
2025-12-04T15:04:48.569510442Z [inf]  Slow database query
2025-12-04T15:04:48.814562885Z [inf]  Slow database query
2025-12-04T15:04:48.875485602Z [inf]  Slow database query
2025-12-04T15:04:51.327100794Z [inf]  Slow database query
2025-12-04T15:04:51.433344125Z [inf]  Slow database query
2025-12-04T15:04:52.169098836Z [inf]  Slow database query
2025-12-04T15:04:53.338443234Z [inf]  Slow database query
2025-12-04T15:04:53.454341439Z [inf]  Slow database query
2025-12-04T15:05:23.456300264Z [inf]      at CredentialsController.getMany (/app/packages/cli/src/credentials/credentials.controller.ts:72:23)
2025-12-04T15:05:23.456311344Z [inf]      at handler (/app/packages/cli/src/controller.registry.ts:79:12)
2025-12-04T15:05:23.456320680Z [inf]      at /app/packages/cli/src/response-helper.ts:157:17
2025-12-04T15:05:23.456322115Z [inf]  Slow database query
2025-12-04T15:05:23.456329622Z [inf]
2025-12-04T15:05:23.456337880Z [inf]  error:1C800064:Provider routines::bad decrypt
2025-12-04T15:05:23.456345000Z [inf]  Credentials could not be decrypted. The likely reason is that a different "encryptionKey" was used to encrypt the data.
2025-12-04T15:05:23.456352677Z [inf]  Error: Credentials could not be decrypted. The likely reason is that a different "encryptionKey" was used to encrypt the data.
2025-12-04T15:05:23.456354474Z [inf]  Slow database query
2025-12-04T15:05:23.456364218Z [inf]  Slow database query
2025-12-04T15:05:23.456372365Z [inf]  Credentials could not be decrypted. The likely reason is that a different "encryptionKey" was used to encrypt the data.
2025-12-04T15:05:23.456379443Z [inf]  Error: Credentials could not be decrypted. The likely reason is that a different "encryptionKey" was used to encrypt the data.
2025-12-04T15:05:23.456384744Z [inf]      at Credentials.getData (/app/packages/core/src/credentials.ts:57:10)
2025-12-04T15:05:23.456390387Z [inf]      at CredentialsService.decrypt (/app/packages/cli/src/credentials/credentials.service.ts:368:32)
2025-12-04T15:05:23.456396890Z [inf]      at /app/packages/cli/src/credentials/credentials.service.ts:155:65
2025-12-04T15:05:23.456402080Z [inf]      at Array.map (<anonymous>)
2025-12-04T15:05:23.456406957Z [inf]      at CredentialsService.getMany (/app/packages/cli/src/credentials/credentials.service.ts:154:31)
2025-12-04T15:05:23.456414015Z [inf]      at processTicksAndRejections (node:internal/process/task_queues:105:5)
2025-12-04T15:05:23.456977902Z [inf]      at Credentials.getData (/app/packages/core/src/credentials.ts:57:10)
2025-12-04T15:05:23.456991202Z [inf]      at CredentialsService.decrypt (/app/packages/cli/src/credentials/credentials.service.ts:368:32)
2025-12-04T15:05:23.457002849Z [inf]      at /app/packages/cli/src/credentials/credentials.service.ts:155:65
2025-12-04T15:05:23.457011512Z [inf]      at Array.map (<anonymous>)
2025-12-04T15:05:23.457012107Z [inf]      at handler (/app/packages/cli/src/controller.registry.ts:79:12)
2025-12-04T15:05:23.457012142Z [inf]      at Array.map (<anonymous>)
2025-12-04T15:05:23.457020644Z [inf]      at CredentialsService.getMany (/app/packages/cli/src/credentials/credentials.service.ts:154:31)
2025-12-04T15:05:23.457024486Z [inf]      at /app/packages/cli/src/response-helper.ts:157:17
2025-12-04T15:05:23.457024706Z [inf]      at CredentialsService.getMany (/app/packages/cli/src/credentials/credentials.service.ts:154:31)
2025-12-04T15:05:23.457029955Z [inf]  Error: Credentials could not be decrypted. The likely reason is that a different "encryptionKey" was used to encrypt the data.
2025-12-04T15:05:23.457030015Z [inf]      at processTicksAndRejections (node:internal/process/task_queues:105:5)
2025-12-04T15:05:23.457039902Z [inf]      at CredentialsController.getMany (/app/packages/cli/src/credentials/credentials.controller.ts:72:23)
2025-12-04T15:05:23.457040041Z [inf]
2025-12-04T15:05:23.457041857Z [inf]      at Credentials.getData (/app/packages/core/src/credentials.ts:57:10)
2025-12-04T15:05:23.457049600Z [inf]  error:1C800064:Provider routines::bad decrypt
2025-12-04T15:05:23.457051393Z [inf]      at CredentialsService.decrypt (/app/packages/cli/src/credentials/credentials.service.ts:368:32)
2025-12-04T15:05:23.457058480Z [inf]  Credentials could not be decrypted. The likely reason is that a different "encryptionKey" was used to encrypt the data.
2025-12-04T15:05:23.457059797Z [inf]      at /app/packages/cli/src/credentials/credentials.service.ts:155:65
2025-12-04T15:05:23.457901606Z [inf]      at processTicksAndRejections (node:internal/process/task_queues:105:5)
2025-12-04T15:05:23.457908120Z [inf]      at processTicksAndRejections (node:internal/process/task_queues:105:5)
2025-12-04T15:05:23.457912086Z [inf]      at CredentialsController.getMany (/app/packages/cli/src/credentials/credentials.controller.ts:72:23)
2025-12-04T15:05:23.457919410Z [inf]      at CredentialsController.getMany (/app/packages/cli/src/credentials/credentials.controller.ts:72:23)
2025-12-04T15:05:23.457920833Z [inf]      at handler (/app/packages/cli/src/controller.registry.ts:79:12)
2025-12-04T15:05:23.457928183Z [inf]      at handler (/app/packages/cli/src/controller.registry.ts:79:12)
2025-12-04T15:05:23.457929555Z [inf]      at /app/packages/cli/src/response-helper.ts:157:17
2025-12-04T15:05:23.457936407Z [inf]      at /app/packages/cli/src/response-helper.ts:157:17
2025-12-04T15:05:23.457942237Z [inf]
2025-12-04T15:05:23.457943717Z [inf]
2025-12-04T15:05:23.457951553Z [inf]  error:1C800064:Provider routines::bad decrypt
2025-12-04T15:05:23.457958475Z [inf]  Credentials could not be decrypted. The likely reason is that a different "encryptionKey" was used to encrypt the data.
2025-12-04T15:05:23.457979051Z [inf]  Error: Credentials could not be decrypted. The likely reason is that a different "encryptionKey" was used to encrypt the data.
2025-12-04T15:05:23.457985916Z [inf]      at Credentials.getData (/app/packages/core/src/credentials.ts:57:10)
2025-12-04T15:05:23.457993186Z [inf]      at CredentialsService.decrypt (/app/packages/cli/src/credentials/credentials.service.ts:368:32)
2025-12-04T15:05:23.458000254Z [inf]      at /app/packages/cli/src/credentials/credentials.service.ts:155:65
2025-12-04T15:05:23.458006967Z [inf]      at Array.map (<anonymous>)
2025-12-04T15:05:23.458013687Z [inf]      at CredentialsService.getMany (/app/packages/cli/src/credentials/credentials.service.ts:154:31)
2025-12-04T15:05:23.458331387Z [inf]  error:1C800064:Provider routines::bad decrypt
2025-12-04T15:05:27.344668025Z [inf]        "workflowId"
2025-12-04T15:05:27.344675557Z [inf]  Error: Invalid collaboration message format
2025-12-04T15:05:27.344678468Z [inf]  ]
2025-12-04T15:05:27.344681886Z [inf]      ]
2025-12-04T15:05:27.344689411Z [inf]      at Push.<anonymous> (/app/packages/cli/src/collaboration/collaboration.service.ts:39:7)
2025-12-04T15:05:27.344692494Z [inf]    }
2025-12-04T15:05:27.344692833Z [inf]      "validation": "uuid",
2025-12-04T15:05:27.344700132Z [inf]      at processTicksAndRejections (node:internal/process/task_queues:105:5)
2025-12-04T15:05:27.344702818Z [inf]      "code": "invalid_string",
2025-12-04T15:05:27.344711492Z [inf]
2025-12-04T15:05:27.344711794Z [inf]      "message": "Invalid workflow ID format",
2025-12-04T15:05:27.344721591Z [inf]      "path": [
2025-12-04T15:05:27.344722652Z [inf]  [
2025-12-04T15:05:27.344723431Z [inf]  Invalid collaboration message format
2025-12-04T15:05:27.344732213Z [inf]    {
2025-12-04T15:05:47.331920258Z [inf]  Invalid collaboration message format
2025-12-04T15:05:47.331932035Z [inf]  Error: Invalid collaboration message format
2025-12-04T15:05:47.331940710Z [inf]      at Push.<anonymous> (/app/packages/cli/src/collaboration/collaboration.service.ts:39:7)
2025-12-04T15:05:47.331947447Z [inf]      at processTicksAndRejections (node:internal/process/task_queues:105:5)
2025-12-04T15:05:47.331954860Z [inf]
2025-12-04T15:05:47.331961787Z [inf]  [
2025-12-04T15:05:47.331970973Z [inf]    {
2025-12-04T15:05:47.331978434Z [inf]      "validation": "uuid",
2025-12-04T15:05:47.331985591Z [inf]      "code": "invalid_string",
2025-12-04T15:05:47.331994545Z [inf]      "message": "Invalid workflow ID format",
2025-12-04T15:05:47.332002781Z [inf]      "path": [
2025-12-04T15:05:47.332013477Z [inf]        "workflowId"
2025-12-04T15:05:47.332021943Z [inf]      ]
2025-12-04T15:05:47.332030531Z [inf]    }
2025-12-04T15:05:47.332040454Z [inf]  ]
2025-12-04T15:10:08.691847315Z [inf]  Attempt to delete credential blocked due to lack of permissions
2025-12-04T15:10:08.691851766Z [inf]  Attempt to delete credential blocked due to lack of permissions
2025-12-04T15:10:11.161771949Z [inf]  Attempt to delete credential blocked due to lack of permissions
2025-12-04T15:10:41.185951062Z [inf]      "message": "Invalid workflow ID format",
2025-12-04T15:10:41.185959630Z [inf]      "path": [
2025-12-04T15:10:41.185966722Z [inf]        "workflowId"
2025-12-04T15:10:41.185971094Z [inf]      ]
2025-12-04T15:10:41.185975437Z [inf]    }
2025-12-04T15:10:41.185980561Z [inf]  ]
2025-12-04T15:10:41.185983855Z [inf]  Invalid collaboration message format
2025-12-04T15:10:41.185987687Z [inf]  Error: Invalid collaboration message format
2025-12-04T15:10:41.185992080Z [inf]      at Push.<anonymous> (/app/packages/cli/src/collaboration/collaboration.service.ts:39:7)
2025-12-04T15:10:41.185995615Z [inf]      at processTicksAndRejections (node:internal/process/task_queues:105:5)
2025-12-04T15:10:41.185999585Z [inf]
2025-12-04T15:10:41.186003894Z [inf]  [
2025-12-04T15:10:41.186008107Z [inf]    {
2025-12-04T15:10:41.186011781Z [inf]      "validation": "uuid",
2025-12-04T15:10:41.186015344Z [inf]      "code": "invalid_string",
2025-12-04T15:11:11.502345641Z [inf]  Credential with ID "EYTgXe2XLjIgn3wt" does not exist for type "smtp".
2025-12-04T15:11:11.502351545Z [inf]  Invalid collaboration message format
2025-12-04T15:11:11.502361308Z [inf]  Error: Invalid collaboration message format
2025-12-04T15:11:11.502367264Z [inf]      at Push.<anonymous> (/app/packages/cli/src/collaboration/collaboration.service.ts:39:7)
2025-12-04T15:11:11.502373113Z [inf]      at processTicksAndRejections (node:internal/process/task_queues:105:5)
2025-12-04T15:11:11.502379556Z [inf]
2025-12-04T15:11:11.502385777Z [inf]  [
2025-12-04T15:11:11.502391925Z [inf]    {
2025-12-04T15:11:11.502398963Z [inf]      "validation": "uuid",
2025-12-04T15:11:11.502405262Z [inf]      "code": "invalid_string",
2025-12-04T15:11:11.502411407Z [inf]      "message": "Invalid workflow ID format",
2025-12-04T15:11:11.502417301Z [inf]      "path": [
2025-12-04T15:11:11.502423237Z [inf]        "workflowId"
2025-12-04T15:11:11.502429311Z [inf]      ]
2025-12-04T15:11:11.502435855Z [inf]    }
2025-12-04T15:11:11.502442773Z [inf]  ]
2025-12-04T15:11:17.317748840Z [inf]  Credential with ID "EYTgXe2XLjIgn3wt" does not exist for type "smtp".
2025-12-04T15:11:19.820394282Z [inf]  Credential with ID "EYTgXe2XLjIgn3wt" does not exist for type "smtp".
