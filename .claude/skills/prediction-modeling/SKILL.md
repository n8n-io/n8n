---
name: prediction-modeling
description: Build and judge a predictive model on tabular or time data without fooling yourself - delivery time (ETA), customer churn, sales or demand forecasting per shop, product recommendations, fraud or fake orders, match outcomes. Covers what data to log, time-based validation, leakage, baselines, metrics, confidence intervals, imbalanced classes, and when not to use ML. Use when the user wants to predict something, asks "peut-on prédire…", wants a model for PitUp or football-intel, or shows a model with a suspiciously good score. Our own skill: lessons from football-intel (decisions D9, D51–D55) and a review of the ML-Nexus student projects (MIT), whose common mistakes are listed here.
---

# Prediction modelling without fooling yourself

## 0. Before any model

- Write the **decision** the prediction serves ("show an ETA to the customer", "call the
  shops at risk of leaving", "restock before Friday"). No decision → no model.
- Write the **baseline** a human would use (average delivery time per zone, last week's
  sales, "a customer silent for 30 days is lost"). The model must beat it on new data.
- Check the data exists **at prediction time**. A feature known only afterwards (pickup
  time to predict order acceptance, final score, refund flag) is leakage.
- Often a rule, a SQL average or a dashboard is enough. ML is for when the baseline is
  clearly not good enough and the data volume supports it (hundreds to thousands of rows
  per segment).

## 1. Validation: always by time

The most common mistake in the ML-Nexus projects (delivery time, churn, sales, fraud):
`train_test_split` with random shuffling. It mixes future and past, puts the same courier,
customer or day in train and test, and inflates scores.

- **Split by date**: train on the past, test on the most recent weeks.
- **Walk-forward** for repeated decisions: train up to month M, test month M+1, slide.
- **Group split** when the same entity repeats (customer, courier, shop) and the model
  must work on new ones.
- Fit scalers, encoders and imputers **on the training part only**, inside a pipeline.
  Encoding the whole table before splitting leaks information.
- Keep a final holdout untouched until the very end.

## 2. Metrics that match the decision

| Task | Metric | Also report |
|---|---|---|
| ETA / regression | MAE in minutes (understandable); share within ±5/±10 min | Error by zone, hour, weather; bias (late vs early) |
| Probabilities (churn, match result) | Log loss, Brier | Calibration table (predicted 70 % happens ~70 %?) |
| Rare events (fraud, fake orders) | Precision and recall at the chosen threshold, PR-AUC | Cost of a false alarm vs a missed case; never accuracy alone (99 % "no fraud" is useless) |
| Demand / sales | MAE or WAPE per product or shop | Stock-outs avoided, over-stock |
| Recommendations | Hit rate / recall@k on later purchases | Coverage (not always the same 10 products), conversion in an A/B test |

Compare with the baseline **on the same rows**, and give a bootstrap 95 % confidence
interval of the difference. A gain whose interval contains zero is not a gain
(football-intel D9: ≥ 300 test cases, minimum gain fixed in advance, CI below zero).

## 3. Features

- Start simple: distance, hour, weekday, holiday or event, weather, zone, past averages of
  the same entity (computed only from earlier rows).
- Rolling features must be shifted: the value for an order uses only orders before it.
- Columns that change format over time (renamed fields, new categories) silently empty a
  feature: check coverage per period before reading a result (football-intel D55).
- More features rarely beat better data. Logistic/linear models and gradient boosting
  (XGBoost, LightGBM) cover most tabular needs; deep learning (LSTM etc.) rarely helps on
  small business tables.

## 4. Imbalanced classes

Keep the real class ratio in the test set. Use class weights or threshold tuning before
oversampling; if you use SMOTE, apply it inside training folds only. Choose the threshold
from the business cost, not 0.5.

## 5. Ship and watch

- Log every prediction with its inputs, model version and timestamp; log the real outcome
  later. Without this, no honest evaluation is possible.
- Re-measure on live data monthly; watch drift (new zones, new couriers, season).
- Keep the previous model to roll back; promote a new one only if it beats the active one
  on the same recent period.

## PitUp: what to start logging now

| Future model | Data to record per order |
|---|---|
| Delivery ETA | order time, shop acceptance time, pickup time, delivery time, shop and customer GPS (or zone), courier id, vehicle, weather, order size |
| Shop reliability | accepted / refused / cancelled, preparation time, out-of-stock items |
| Churn / reactivation | customer id, order dates, amounts, complaints, refunds |
| Demand per shop | items sold per day and hour, prices, promotions, local events, holidays |
| Recommendations | items viewed, added, bought together |

Six to eight weeks of clean logs on these fields is enough for a first ETA baseline.

## Gotchas

- A Streamlit app on top of a leaky model only ships the leak faster.
- A score far above the domain's usual level (e.g. 99 % accuracy, R² 0.95 on delivery
  time) usually means leakage, not genius.
- "Best price" or "best case" reference values make anything look profitable
  (football-intel D54): compare with what a real user would get.
