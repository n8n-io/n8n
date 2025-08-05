package main

import (
	"fmt"
	"github.com/test/go-with-tests/pkg/util"
)

func main() {
	fmt.Println("Hello, World!")
	result := Add(2, 3)
	fmt.Printf("2 + 3 = %d\n", result)

	greeting := util.Greet("Go")
	fmt.Println(greeting)
}

// Add returns the sum of two integers
func Add(a, b int) int {
	return a + b
}

// Multiply returns the product of two integers
func Multiply(a, b int) int {
	return a * b
}
