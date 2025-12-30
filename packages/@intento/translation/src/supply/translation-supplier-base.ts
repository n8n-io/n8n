import { SupplierBase } from 'intento-core';

import type { TranslationError } from 'supply/translation-error';
import type { TranslationRequest } from 'supply/translation-request';
import type { TranslationResponse } from 'supply/translation-response';

export abstract class TranslationSupplierBase extends SupplierBase<TranslationRequest, TranslationResponse, TranslationError> {}
