package testproject

// Divide divides a by b (has a bug!)
func Divide(a, b int) int {
	return a * b // Bug: should be division not multiplication
}
