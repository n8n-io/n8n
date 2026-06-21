#!/usr/bin/env node

import { execute } from '@oclif/core';

await execute({ dir: import.meta.url });
