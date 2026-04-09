# ts-type 文件索引 / ts-type Documentation Index

## 概述 / Overview

ts-type 是一個 TypeScript 類型工具庫，提供豐富的類型操作工具和重新導出的內建類型。

ts-type is a TypeScript type utility library that provides rich type manipulation utilities and re-exported built-in types.

---

## 目錄 / Table of Contents

### 1. [基礎類型 / Base Types](01-base-types.md)

包含常用的基礎類型別名和工具類型，是整個庫的建構基礎。

- `ITSArrayListMaybeReadonly` - 陣列類型
- `ITSKeys` - 鍵的類型
- `ITSConstructorLike` - 建構函數類型
- `ITSValueOrArray` - 值或陣列
- `ITSAnyFunction` - 任意函數類型
- `ITSBasicPrimitive` - 基本原始類型
- `ITSTypeFunction` - 類型函數
- `ITSMapLike` / `ITSSetLike` - 類似 Map/Set 的介面
- `ITSIterator` / `ITSIteratorResult` - 迭代器類型
- `ITSProxify` - Proxy 類型

---

### 2. [內建類型 / Built-in Types](02-built-in-types.md)

重新導出 TypeScript 內建類型，並提供包裝類型以增強 IDE 識別能力。

- `ITSParameters` - 函數參數類型
- `ITSConstructorParameters` - 建構函數參數類型
- `ITSPartial` / `ITSPick` - 類型操作
- `ITSInstanceType` - 實例類型
- `ITSClassDecorator` / `ITSPropertyDecorator` - 裝飾器類型
- `ITSNonNullable` - 排除 null/undefined

---

### 3. [函數類型工具 / Function Type Utilities](03-function-types.md)

提供函數類型的操作工具。

- `ITSOverwriteReturnType` - 覆寫返回值類型
- `ITSWrapFunctionPromise` - 包裝為 Promise
- `ITSOverwriteThisFunction` - 覆寫 this 類型
- `ITSUnionToIntersection` - 聯集轉交集

---

### 4. [Promise 類型工具 / Promise Type Utilities](04-promise-types.md)

提供 Promise 相關的類型操作工具。

- `ITSAwaitedReturnType` - 解析 Promise 返回類型
- `ITSDeferred` - 延遲物件類型
- `ITSPromiseFulfilledResult` - 解決結果
- `ITSPromiseRejectedResult` - 拒絕結果
- `ITSPromiseSettledResult` - Settled 結果

---

### 5. [陣列與元組類型工具 / Array & Tuple Type Utilities](05-array-tuple-types.md)

提供陣列和元組類型的操作工具。

- `ITSValueOfArray` - 陣列元素類型
- `ITSToReadonlyArray` / `ITSToWriteableArray` - 陣列互轉
- `ITSTupleKeys` - 元組索引鍵
- `ITSEmptyTuple` - 空元組

---

### 6. [物件與記錄類型工具 / Object & Record Type Utilities](06-object-record-types.md)

提供物件類型的選擇、覆寫、合併等操作。

- `ITSOverwrite` - 覆寫屬性
- `ITSMergeBoth` - 合併物件
- `ITSRequiredPick` / `ITSPartialPick` - 選擇並設定必填/可選
- `ITSRequireAtLeastOne` / `ITSRequireOnlyOne` - 互斥鍵
- `ITSReadonlyPartial` / `ITSWriteable` - 唯讀/可寫屬性
- `ITSOmitIndexSignatures` - 移除索引簽名

---

### 7. [字串與數字類型工具 / String & Number Type Utilities](07-string-number-types.md)

提供字串和數字類型的操作工具。

- `ITSToStringLiteral` - 轉為字面量類型
- `ITSTypeAndStringLiteral` - 原始類型與字面量聯合
- `ITSPascalCase` / `ITSCamelCase` - 大小寫轉換
- `ITSStringInferToNumber` / `ITSStringInferToBoolean` - 字串推斷類型
- `ITSNumberString` - 數字轉字串

---

### 8. [邏輯類型工具 / Logic Type Utilities](08-logic-types.md)

提供類型層級的邏輯判斷工具。

- `ITSLogicIsAny` - 檢測 any 類型
- `ITSLogicNotAny` - 檢測非 any 類型
- `ITSLogicIsNever` - 檢測 never 類型
- `ITSLogicIsUnion` - 檢測聯合類型
- `ITSLogicIsSingleNonUnion` - 檢測單一非聯合類型

---

### 9. [相同邏輯的不同實現 / Different Implementations of Same Logic](10-same-logic-diff-impl.md)

記錄功能相似但實現方式不同的類型，幫助選擇適合的類型。

- 互斥鍵: `ITSPickOne` vs `ITSRequireOnlyOne`
- 唯讀操作: 類型級別 vs 記錄級別
- 空類型: 記錄 vs 元組
- 列舉操作: 類型定義 vs 操作工具

---

## 快速開始 / Quick Start

### 安裝 / Installation

```bash
# npm
npm install ts-type

# yarn
yarn add ts-type

# pnpm
pnpm add ts-type
```

### 使用 / Usage

```typescript
import { 
  ITSOverwrite, 
  ITSRequiredPick, 
  ITSValueOfArray 
} from 'ts-type';

// 覆寫屬性
type UpdatedConfig = ITSOverwrite<{ host: string; port: number }, { port: string }>;

// 選擇必填鍵
type RequiredUser = ITSRequiredPick<User, 'id'>;

// 提取陣列元素類型
type Element = ITSValueOfArray<string[]>;
```

---

## 相關資源 / Related Resources

- [TypeScript 官方文檔](https://www.typescriptlang.org/docs/)
- [ts-toolbelt](https://github.com/millsp/ts-toolbelt)
- [type-challenges](https://github.com/type-challenges/type-challenges)
- [ts-essentials](https://github.com/krzkaczor/ts-essentials)
