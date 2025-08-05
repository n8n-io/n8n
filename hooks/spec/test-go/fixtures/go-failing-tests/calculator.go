package main

import "errors"

// Calculator provides basic arithmetic operations
type Calculator struct{}

// Add returns the sum of two numbers
func (c *Calculator) Add(a, b float64) float64 {
	// Bug: should be a + b
	return a - b
}

// Subtract returns the difference of two numbers
func (c *Calculator) Subtract(a, b float64) float64 {
	return a - b
}

// Multiply returns the product of two numbers
func (c *Calculator) Multiply(a, b float64) float64 {
	// Bug: wrong operation
	return a + b
}

// Divide returns the quotient of two numbers
func (c *Calculator) Divide(a, b float64) (float64, error) {
	if b == 0 {
		return 0, errors.New("division by zero")
	}
	// Bug: should be a / b
	return a * b, nil
}

// Power calculates a raised to the power of b
func (c *Calculator) Power(a, b float64) float64 {
	// Completely wrong implementation
	return a * b
}
