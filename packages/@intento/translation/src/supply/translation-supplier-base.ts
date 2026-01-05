import { SupplierBase } from 'intento-core';

import type { TranslationError } from 'supply/translation-error';
import type { TranslationRequest } from 'supply/translation-request';
import type { TranslationResponse } from 'supply/translation-response';

/**
 * Base class for translation service suppliers.
 *
 * Extends generic SupplierBase with translation-specific request/response/error types.
 * All translation suppliers must inherit from this class to ensure consistent API contracts
 * and enable polymorphic handling of different translation providers.
 */
export abstract class TranslationSupplierBase extends SupplierBase<TranslationRequest, TranslationResponse, TranslationError> {}
