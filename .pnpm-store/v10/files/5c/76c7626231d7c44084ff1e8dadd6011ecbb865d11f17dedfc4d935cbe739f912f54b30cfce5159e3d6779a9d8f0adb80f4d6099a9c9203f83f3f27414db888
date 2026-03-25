/**
 * Copyright(c) Microsoft Corporation.All rights reserved.
 * Licensed under the MIT License.
 */
import { CardAction } from '@microsoft/agents-activity';
import { Fact } from './fact';
import { ReceiptItem } from './receiptItem';
/**
 * Represents a receipt card.
 */
export interface ReceiptCard {
    /**
     * The title of the card.
     */
    title: string;
    /**
     * The facts of the card.
     */
    facts: Fact[];
    /**
     * The items of the card.
     */
    items: ReceiptItem[];
    /**
     * The tap action of the card.
     */
    tap?: CardAction;
    /**
     * The total amount of the receipt.
     */
    total: string;
    /**
     * The tax amount of the receipt.
     */
    tax: string;
    /**
     * The VAT amount of the receipt.
     */
    vat?: string;
    /**
     * The buttons of the card.
     */
    buttons: CardAction[];
}
